import { eq } from "drizzle-orm";
import type { AppDatabase } from "../config/database.js";
import { empresas } from "../db/schema/index.js";
import { AppError } from "../utils/AppError.js";

export async function getEmpresa(db: AppDatabase, id?: number) {
    const rows = id
        ? await db.select().from(empresas).where(eq(empresas.id, id)).limit(1)
        : await db.select().from(empresas).limit(1);
    const empresa = rows[0];

    if (!empresa) {
        throw new AppError("Empresa não encontrada", 404);
    }

    return empresa;
}

export async function updateEmpresa(db: AppDatabase, id: number, dto: { nome?: string }) {
    await getEmpresa(db, id);

    const patch: { nome?: string } = {};

    if (dto.nome !== undefined) {
        patch.nome = dto.nome.trim();
    }

    if (Object.keys(patch).length === 0) {
        return getEmpresa(db, id);
    }

    const updated = await db.update(empresas).set(patch).where(eq(empresas.id, id)).returning();
    const empresa = updated[0];

    if (!empresa) {
        throw new AppError("Empresa não encontrada", 404);
    }

    return empresa;
}
