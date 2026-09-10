import { eq, sql } from "drizzle-orm";
import type { AppDatabase } from "../config/database.js";
import { ordensServico, pagamentos, registrosEntradaSaida, statusOs } from "../db/schema/index.js";
import { AppError } from "../utils/AppError.js";

export async function getRegistro(db: AppDatabase, id: number) {
    const rows = await db.select().from(registrosEntradaSaida).where(eq(registrosEntradaSaida.id, id)).limit(1);
    const registro = rows[0];

    if (!registro) {
        throw new AppError("Registro de entrada/saída não encontrado", 404);
    }

    const pagamentoRows = await db.select().from(pagamentos).where(eq(pagamentos.regEntradaSaidaId, id));
    const osRows = await db.select().from(ordensServico).where(eq(ordensServico.regEntradaSaidaId, id)).limit(1);

    return {
        ...registro,
        pagamentos: pagamentoRows,
        ordemServico: osRows[0] ?? null
    };
}

async function replacePagamentos(
    db: AppDatabase,
    resId: number,
    lista: Array<{ tipo: string; valor: number }>
): Promise<void> {
    await db.delete(pagamentos).where(eq(pagamentos.regEntradaSaidaId, resId));

    for (const pagamento of lista) {
        await db.insert(pagamentos).values({
            tipo: pagamento.tipo.trim().toLowerCase(),
            valor: Number(pagamento.valor),
            regEntradaSaidaId: resId
        });
    }
}

export async function createRegistro(
    db: AppDatabase,
    dto: {
        nome: string;
        tipo: string;
        valor: number;
        descricao?: string;
        dataLimitePagamento?: Date | string;
        usuarioCpf: string;
        pagamentos?: Array<{ tipo: string; valor: number }>;
    }
) {
    const inserted = await db
        .insert(registrosEntradaSaida)
        .values({
            nome: dto.nome.trim(),
            tipo: dto.tipo.trim().toLowerCase(),
            valor: Number(dto.valor),
            descricao: dto.descricao ?? null,
            dataLimitePagamento: dto.dataLimitePagamento ? new Date(dto.dataLimitePagamento) : null,
            usuarioCpf: dto.usuarioCpf
        })
        .returning();
    const registro = inserted[0];

    if (!registro) {
        throw new AppError("Não foi possível criar o registro", 500);
    }

    if (dto.pagamentos) {
        await replacePagamentos(db, registro.id, dto.pagamentos);
    }

    return getRegistro(db, registro.id);
}

export async function updateRegistro(
    db: AppDatabase,
    id: number,
    dto: {
        nome?: string;
        tipo?: string;
        valor?: number;
        descricao?: string | null;
        dataLimitePagamento?: Date | string | null;
        pagamentos?: Array<{ tipo: string; valor: number }>;
        replaceNested: boolean;
    }
) {
    const current = await getRegistro(db, id);

    if (current.ordemServico && dto.tipo !== undefined && dto.tipo.trim().toLowerCase() !== "entrada") {
        throw new AppError("Registro gerado por OS deve permanecer como entrada", 409, {
            tipo: "Não altere o tipo de um lançamento ligado a OS"
        });
    }

    const patch: Record<string, unknown> = {};

    if (dto.nome !== undefined) {
        patch.nome = dto.nome.trim();
    }

    if (dto.tipo !== undefined) {
        patch.tipo = dto.tipo.trim().toLowerCase();
    }

    if (dto.valor !== undefined) {
        patch.valor = Number(dto.valor);
    }

    if (dto.descricao !== undefined) {
        patch.descricao = dto.descricao;
    }

    if (dto.dataLimitePagamento !== undefined) {
        patch.dataLimitePagamento = dto.dataLimitePagamento ? new Date(dto.dataLimitePagamento) : null;
    }

    if (Object.keys(patch).length > 0) {
        await db.update(registrosEntradaSaida).set(patch).where(eq(registrosEntradaSaida.id, id));
    }

    if (dto.pagamentos !== undefined) {
        await replacePagamentos(db, id, dto.pagamentos);
    }

    return getRegistro(db, id);
}

export async function deleteRegistro(db: AppDatabase, id: number) {
    const current = await getRegistro(db, id);

    if (current.ordemServico) {
        throw new AppError("Registro ligado a ordem de serviço deve ser gerenciado pela OS", 409);
    }

    await db.delete(registrosEntradaSaida).where(eq(registrosEntradaSaida.id, id));

    return current;
}

export async function resumoOsStatus(db: AppDatabase) {
    const statuses = await db.select().from(statusOs);
    const counts = await db
        .select({
            statusOsId: ordensServico.statusOsId,
            total: sql<number>`count(*)`
        })
        .from(ordensServico)
        .groupBy(ordensServico.statusOsId);
    const byId = new Map(counts.map((row) => [row.statusOsId, Number(row.total)]));

    return statuses.map((status) => ({
        id: status.id,
        nome: status.nome,
        total: byId.get(status.id) ?? 0
    }));
}

export async function fluxoMensal(db: AppDatabase, ano: number) {
    const rows = await db.select().from(registrosEntradaSaida);
    const months = Array.from({ length: 12 }, (_, index) => ({
        mes: index + 1,
        entrada: 0,
        saida: 0
    }));

    for (const row of rows) {
        const date = row.criadoEm instanceof Date ? row.criadoEm : new Date(row.criadoEm);

        if (date.getFullYear() !== ano) {
            continue;
        }

        const bucket = months[date.getMonth()];

        if (!bucket) {
            continue;
        }

        if (row.tipo === "entrada") {
            bucket.entrada += Number(row.valor);
        } else {
            bucket.saida += Number(row.valor);
        }
    }

    return {
        ano,
        meses: months.map((item) => ({
            ...item,
            entrada: Number(item.entrada.toFixed(2)),
            saida: Number(item.saida.toFixed(2))
        }))
    };
}
