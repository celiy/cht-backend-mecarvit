import { and, eq, ne } from "drizzle-orm";
import type { AppDatabase } from "../config/database.js";
import { enderecos } from "../db/schema/index.js";
import { AppError } from "../utils/AppError.js";
import {
    enderecosMatch,
    normalizeEnderecoFields,
    type EnderecoFields
} from "../utils/enderecoNormalize.js";

export async function findEnderecoDuplicate(
    db: AppDatabase,
    item: EnderecoFields,
    excludeId?: number
): Promise<(typeof enderecos.$inferSelect) | null> {
    const normalized = normalizeEnderecoFields(item);
    const conditions = [
        eq(enderecos.estado, normalized.estado),
        eq(enderecos.cidade, normalized.cidade),
        eq(enderecos.cep, normalized.cep),
        eq(enderecos.bairro, normalized.bairro),
        eq(enderecos.rua, normalized.rua),
        eq(enderecos.numero, normalized.numero),
        eq(enderecos.complemento, normalized.complemento)
    ];

    if (excludeId != null) {
        conditions.push(ne(enderecos.id, excludeId));
    }

    const rows = await db
        .select()
        .from(enderecos)
        .where(and(...conditions))
        .limit(1);

    const row = rows[0];

    if (!row) {
        return null;
    }

    return enderecosMatch(row, normalized) ? row : null;
}

export async function getEndereco(db: AppDatabase, id: number) {
    const rows = await db.select().from(enderecos).where(eq(enderecos.id, id)).limit(1);
    const endereco = rows[0];

    if (!endereco) {
        throw new AppError("Endereço não encontrado", 404);
    }

    return endereco;
}

export async function createEndereco(db: AppDatabase, dto: EnderecoFields) {
    const normalized = normalizeEnderecoFields(dto);
    const duplicate = await findEnderecoDuplicate(db, normalized);

    if (duplicate) {
        throw new AppError("Este endereço já está cadastrado", 409, {
            enderecoId: String(duplicate.id)
        });
    }

    const inserted = await db.insert(enderecos).values(normalized).returning();
    const endereco = inserted[0];

    if (!endereco) {
        throw new AppError("Não foi possível criar o endereço", 500);
    }

    return endereco;
}

export async function updateEndereco(db: AppDatabase, id: number, dto: EnderecoFields) {
    await getEndereco(db, id);
    const normalized = normalizeEnderecoFields(dto);
    const duplicate = await findEnderecoDuplicate(db, normalized, id);

    if (duplicate) {
        throw new AppError("Este endereço já está cadastrado", 409, {
            enderecoId: String(duplicate.id)
        });
    }

    const updated = await db
        .update(enderecos)
        .set(normalized)
        .where(eq(enderecos.id, id))
        .returning();
    const endereco = updated[0];

    if (!endereco) {
        throw new AppError("Não foi possível atualizar o endereço", 500);
    }

    return endereco;
}

export async function findOrCreateEndereco(db: AppDatabase, dto: EnderecoFields): Promise<number> {
    const normalized = normalizeEnderecoFields(dto);
    const duplicate = await findEnderecoDuplicate(db, normalized);

    if (duplicate) {
        return duplicate.id;
    }

    const created = await createEndereco(db, normalized);

    return created.id;
}
