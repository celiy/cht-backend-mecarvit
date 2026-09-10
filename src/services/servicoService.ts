import { eq } from "drizzle-orm";
import type { AppDatabase } from "../config/database.js";
import { itensServico, servicos } from "../db/schema/index.js";
import { AppError } from "../utils/AppError.js";

export async function listServicos(db: AppDatabase) {
    return db.select().from(servicos);
}

export async function getServico(db: AppDatabase, id: number) {
    const rows = await db.select().from(servicos).where(eq(servicos.id, id)).limit(1);
    const servico = rows[0];

    if (!servico) {
        throw new AppError("Serviço não encontrado", 404);
    }

    return servico;
}

export async function createServico(db: AppDatabase, dto: { nome: string }) {
    const inserted = await db.insert(servicos).values({ nome: dto.nome.trim() }).returning();
    const servico = inserted[0];

    if (!servico) {
        throw new AppError("Não foi possível criar o serviço", 500);
    }

    return servico;
}

export async function updateServico(db: AppDatabase, id: number, dto: { nome?: string }) {
    await getServico(db, id);

    const patch: { nome?: string } = {};

    if (dto.nome !== undefined) {
        patch.nome = dto.nome.trim();
    }

    if (Object.keys(patch).length === 0) {
        return getServico(db, id);
    }

    const updated = await db.update(servicos).set(patch).where(eq(servicos.id, id)).returning();

    return updated[0] ?? getServico(db, id);
}

export async function deleteServico(db: AppDatabase, id: number) {
    const current = await getServico(db, id);
    const used = await db.select().from(itensServico).where(eq(itensServico.servicoId, id)).limit(1);

    if (used[0]) {
        throw new AppError("Serviço em uso em ordem de serviço", 409);
    }

    await db.delete(servicos).where(eq(servicos.id, id));

    return current;
}
