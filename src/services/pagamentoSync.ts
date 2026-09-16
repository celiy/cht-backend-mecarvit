import { eq } from "drizzle-orm";
import type { AppDatabase } from "../config/database.js";
import { pagamentos } from "../db/schema/index.js";

export type PagamentoInput = {
    id?: number;
    tipo: string;
    valor: number;
};

/**
 * Replaces the payment list without rewriting untouched rows, so criadoEm stays
 * on existing pagamentos and modificadoEm updates only when tipo/valor change.
 */
export async function replacePagamentos(
    db: AppDatabase,
    resId: number,
    lista: PagamentoInput[]
): Promise<void> {
    const existing = await db.select().from(pagamentos).where(eq(pagamentos.regEntradaSaidaId, resId));
    const existingById = new Map(existing.map((row) => [row.id, row]));
    const keptIds = new Set<number>();

    for (const pagamento of lista) {
        const tipo = pagamento.tipo.trim().toLowerCase();
        const valor = Number(pagamento.valor);
        const current =
            pagamento.id != null && Number.isInteger(pagamento.id) && pagamento.id > 0
                ? existingById.get(pagamento.id)
                : undefined;

        if (current && !keptIds.has(current.id)) {
            keptIds.add(current.id);

            if (current.tipo !== tipo || Number(current.valor) !== valor) {
                await db
                    .update(pagamentos)
                    .set({
                        tipo,
                        valor,
                        modificadoEm: new Date()
                    })
                    .where(eq(pagamentos.id, current.id));
            }

            continue;
        }

        await db.insert(pagamentos).values({
            tipo,
            valor,
            regEntradaSaidaId: resId
        });
    }

    for (const row of existing) {
        if (!keptIds.has(row.id)) {
            await db.delete(pagamentos).where(eq(pagamentos.id, row.id));
        }
    }
}
