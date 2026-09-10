import bcrypt from "bcrypt";
import { and, eq } from "drizzle-orm";
import { digitsOnly } from "@shared/validators/mecarvit";
import type { AppDatabase } from "../config/database.js";
import type { AuthUsuario, PublicUsuario } from "../entities/Usuario.js";
import { cargos, usuarios } from "../db/schema/index.js";
import { AppError } from "../utils/AppError.js";
import { isSuperadmin } from "../utils/access.js";

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

type UsuarioRow = typeof usuarios.$inferSelect;
type CargoRow = typeof cargos.$inferSelect;

function toPublic(user: UsuarioRow, cargo: CargoRow): PublicUsuario {
    return {
        cpf: user.cpf,
        nome: user.nome,
        email: user.email,
        ativo: user.ativo,
        senhaInicial: user.senhaInicial,
        fundador: user.fundador,
        cargoId: user.cargoId,
        empresaId: user.empresaId,
        nivelAcesso: cargo.nivelAcesso,
        cargoNome: cargo.nome,
        criadoEm: user.criadoEm,
        modificadoEm: user.modificadoEm
    };
}

export async function hashSenha(senha: string): Promise<string> {
    return bcrypt.hash(senha, BCRYPT_ROUNDS);
}

export async function findAuthByCpf(db: AppDatabase, cpf: string): Promise<AuthUsuario | null> {
    const normalized = digitsOnly(cpf);
    const rows = await db
        .select({ user: usuarios, cargo: cargos })
        .from(usuarios)
        .innerJoin(cargos, eq(usuarios.cargoId, cargos.id))
        .where(eq(usuarios.cpf, normalized))
        .limit(1);
    const row = rows[0];

    if (!row) {
        return null;
    }

    return {
        ...toPublic(row.user, row.cargo),
        senha: row.user.senha
    };
}

export async function findAuthByEmail(db: AppDatabase, email: string): Promise<AuthUsuario | null> {
    const rows = await db
        .select({ user: usuarios, cargo: cargos })
        .from(usuarios)
        .innerJoin(cargos, eq(usuarios.cargoId, cargos.id))
        .where(eq(usuarios.email, email.trim().toLowerCase()))
        .limit(1);
    const row = rows[0];

    if (!row) {
        return null;
    }

    return {
        ...toPublic(row.user, row.cargo),
        senha: row.user.senha
    };
}

export async function findPublicByCpf(db: AppDatabase, cpf: string): Promise<PublicUsuario | null> {
    const auth = await findAuthByCpf(db, cpf);

    if (!auth) {
        return null;
    }

    const { senha: _senha, ...publicUser } = auth;

    return publicUser;
}

export async function createUsuario(
    db: AppDatabase,
    dto: {
        cpf: string;
        nome: string;
        email: string;
        senha: string;
        cargoId: number;
        empresaId: number;
        fundador?: boolean;
        senhaInicial?: boolean;
        ativo?: boolean;
    }
): Promise<PublicUsuario> {
    const cargoRows = await db.select().from(cargos).where(eq(cargos.id, dto.cargoId)).limit(1);
    const cargo = cargoRows[0];

    if (!cargo) {
        throw new AppError("Cargo não encontrado", 404, { cargoId: "Cargo não encontrado" });
    }

    if (isSuperadmin(cargo.nivelAcesso) && !dto.fundador) {
        throw new AppError("nivelAcesso 0 é exclusivo do gestor fundador", 400, {
            cargoId: "Não é permitido atribuir o cargo de superadmin"
        });
    }

    const passwordHash = await hashSenha(dto.senha);
    const inserted = await db
        .insert(usuarios)
        .values({
            cpf: digitsOnly(dto.cpf),
            nome: dto.nome.trim(),
            email: dto.email.trim().toLowerCase(),
            senha: passwordHash,
            cargoId: dto.cargoId,
            empresaId: dto.empresaId,
            fundador: dto.fundador ?? false,
            senhaInicial: dto.senhaInicial ?? false,
            ativo: dto.ativo ?? true
        })
        .returning();
    const row = inserted[0];

    if (!row) {
        throw new AppError("Não foi possível criar o usuário", 500);
    }

    return toPublic(row, cargo);
}

export async function updateUsuario(
    db: AppDatabase,
    cpf: string,
    dto: {
        nome?: string;
        email?: string;
        senha?: string;
        cargoId?: number;
        ativo?: boolean;
        senhaInicial?: boolean;
        actor?: PublicUsuario;
    }
): Promise<PublicUsuario> {
    const current = await findAuthByCpf(db, cpf);

    if (!current) {
        throw new AppError("Usuário não encontrado", 404);
    }

    const patch: Partial<UsuarioRow> = {};

    if (dto.nome !== undefined) {
        patch.nome = dto.nome.trim();
    }

    if (dto.email !== undefined) {
        patch.email = dto.email.trim().toLowerCase();
    }

    if (dto.senha !== undefined) {
        patch.senha = await hashSenha(dto.senha);
    }

    if (dto.senhaInicial !== undefined) {
        patch.senhaInicial = dto.senhaInicial;
    }

    if (dto.ativo !== undefined) {
        if (current.fundador && dto.ativo === false) {
            throw new AppError("O gestor fundador não pode ser inativado", 409, {
                ativo: "O gestor fundador não pode ser inativado"
            });
        }

        patch.ativo = dto.ativo;
    }

    if (dto.cargoId !== undefined) {
        const cargoRows = await db.select().from(cargos).where(eq(cargos.id, dto.cargoId)).limit(1);
        const cargo = cargoRows[0];

        if (!cargo) {
            throw new AppError("Cargo não encontrado", 404, { cargoId: "Cargo não encontrado" });
        }

        if (isSuperadmin(cargo.nivelAcesso) && !current.fundador) {
            throw new AppError("nivelAcesso 0 é exclusivo do gestor fundador", 400, {
                cargoId: "Não é permitido atribuir o cargo de superadmin"
            });
        }

        if (current.fundador && !isSuperadmin(cargo.nivelAcesso)) {
            throw new AppError("O gestor fundador deve permanecer superadmin", 409, {
                cargoId: "O gestor fundador não pode perder o cargo de superadmin"
            });
        }

        patch.cargoId = dto.cargoId;
    }

    if (Object.keys(patch).length === 0) {
        const { senha: _senha, ...publicUser } = current;
        return publicUser;
    }

    const updated = await db
        .update(usuarios)
        .set(patch)
        .where(eq(usuarios.cpf, current.cpf))
        .returning();
    const row = updated[0];

    if (!row) {
        throw new AppError("Usuário não encontrado", 404);
    }

    const publicUser = await findPublicByCpf(db, row.cpf);

    if (!publicUser) {
        throw new AppError("Usuário não encontrado", 404);
    }

    return publicUser;
}

export async function changeSenha(
    db: AppDatabase,
    cpf: string,
    senhaAtual: string,
    senhaNova: string
): Promise<PublicUsuario> {
    const current = await findAuthByCpf(db, cpf);

    if (!current) {
        throw new AppError("Usuário não encontrado", 404);
    }

    const matches = await bcrypt.compare(senhaAtual, current.senha);

    if (!matches) {
        throw new AppError("Senha atual inválida", 400, { senhaAtual: "Senha atual inválida" });
    }

    return updateUsuario(db, cpf, { senha: senhaNova, senhaInicial: false });
}

export async function countUsuariosByCargo(db: AppDatabase, cargoId: number): Promise<number> {
    const rows = await db.select().from(usuarios).where(eq(usuarios.cargoId, cargoId));

    return rows.length;
}

export async function findCargoById(db: AppDatabase, cargoId: number) {
    const rows = await db.select().from(cargos).where(eq(cargos.id, cargoId)).limit(1);

    return rows[0] ?? null;
}

export { toPublic };

export async function listUsuariosJoined(db: AppDatabase, whereCpf?: string) {
    const query = db
        .select({ user: usuarios, cargo: cargos })
        .from(usuarios)
        .innerJoin(cargos, eq(usuarios.cargoId, cargos.id));

    const rows = whereCpf
        ? await query.where(and(eq(usuarios.cpf, digitsOnly(whereCpf)))).limit(1)
        : await query;

    return rows.map((row) => toPublic(row.user, row.cargo));
}
