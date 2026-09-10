import { eq } from "drizzle-orm";
import type { AppDatabase } from "../config/database.js";
import { cargos } from "../db/schema/index.js";
import { AppError } from "../utils/AppError.js";
import { isSuperadmin } from "../utils/access.js";
import { countUsuariosByCargo } from "./usuarioService.js";

export async function listCargos(db: AppDatabase) {
    return db.select().from(cargos);
}

export async function getCargo(db: AppDatabase, id: number) {
    const rows = await db.select().from(cargos).where(eq(cargos.id, id)).limit(1);
    const cargo = rows[0];

    if (!cargo) {
        throw new AppError("Cargo não encontrado", 404);
    }

    return cargo;
}

export async function createCargo(db: AppDatabase, dto: { nome: string; nivelAcesso: string }) {
    if (isSuperadmin(String(dto.nivelAcesso))) {
        throw new AppError("nivelAcesso 0 é exclusivo do gestor fundador", 400, {
            nivelAcesso: "Não é permitido criar outro cargo superadmin"
        });
    }

    const inserted = await db
        .insert(cargos)
        .values({
            nome: dto.nome.trim(),
            nivelAcesso: String(dto.nivelAcesso).trim()
        })
        .returning();
    const cargo = inserted[0];

    if (!cargo) {
        throw new AppError("Não foi possível criar o cargo", 500);
    }

    return cargo;
}

export async function updateCargo(
    db: AppDatabase,
    id: number,
    dto: { nome?: string; nivelAcesso?: string }
) {
    const current = await getCargo(db, id);

    if (isSuperadmin(current.nivelAcesso) && dto.nivelAcesso !== undefined && !isSuperadmin(String(dto.nivelAcesso))) {
        throw new AppError("O cargo de superadmin não pode perder o nível 0", 409, {
            nivelAcesso: "O cargo de superadmin não pode ser alterado"
        });
    }

    if (dto.nivelAcesso !== undefined && isSuperadmin(String(dto.nivelAcesso)) && !isSuperadmin(current.nivelAcesso)) {
        throw new AppError("nivelAcesso 0 é exclusivo do gestor fundador", 400, {
            nivelAcesso: "Não é permitido promover um cargo a superadmin"
        });
    }

    const patch: { nome?: string; nivelAcesso?: string } = {};

    if (dto.nome !== undefined) {
        patch.nome = dto.nome.trim();
    }

    if (dto.nivelAcesso !== undefined) {
        patch.nivelAcesso = String(dto.nivelAcesso).trim();
    }

    if (Object.keys(patch).length === 0) {
        return current;
    }

    const updated = await db.update(cargos).set(patch).where(eq(cargos.id, id)).returning();
    const cargo = updated[0];

    if (!cargo) {
        throw new AppError("Cargo não encontrado", 404);
    }

    return cargo;
}

export async function deleteCargo(db: AppDatabase, id: number) {
    const current = await getCargo(db, id);

    if (isSuperadmin(current.nivelAcesso)) {
        throw new AppError("O cargo de superadmin não pode ser excluído", 409);
    }

    const inUse = await countUsuariosByCargo(db, id);

    if (inUse > 0) {
        throw new AppError("Cargo em uso por funcionários", 409, {
            id: "Remova ou altere os usuários deste cargo antes de excluí-lo"
        });
    }

    await db.delete(cargos).where(eq(cargos.id, id));

    return current;
}
