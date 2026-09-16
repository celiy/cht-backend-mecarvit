import { eq } from "drizzle-orm";
import { digitsOnly } from "@shared/validators/mecarvit";
import type { AppDatabase } from "../config/database.js";
import { clientes, ordensServico, veiculos } from "../db/schema/index.js";
import { AppError } from "../utils/AppError.js";

export async function getVeiculo(db: AppDatabase, id: number) {
    const rows = await db.select().from(veiculos).where(eq(veiculos.id, id)).limit(1);
    const veiculo = rows[0];

    if (!veiculo) {
        throw new AppError("Veículo não encontrado", 404);
    }

    const clienteRows = await db
        .select()
        .from(clientes)
        .where(eq(clientes.documento, veiculo.clienteDocumento))
        .limit(1);
    const osList = await db.select().from(ordensServico).where(eq(ordensServico.veiculoId, id));

    return {
        ...veiculo,
        cliente: clienteRows[0] ?? null,
        ordensServico: osList
    };
}

export async function createVeiculo(
    db: AppDatabase,
    dto: {
        modelo: string;
        placa: string;
        clienteDocumento: string;
        tipo?: string;
        kilometragem?: number;
        dataTrocaOleo?: Date | string;
        chassi?: string;
    }
) {
    const documento = digitsOnly(dto.clienteDocumento);
    const clienteRows = await db.select().from(clientes).where(eq(clientes.documento, documento)).limit(1);

    if (!clienteRows[0]) {
        throw new AppError("Cliente não encontrado", 404, { clienteDocumento: "Cliente não encontrado" });
    }

    const inserted = await db
        .insert(veiculos)
        .values({
            modelo: dto.modelo.trim(),
            placa: dto.placa.trim().toUpperCase(),
            tipo: dto.tipo?.trim() || null,
            kilometragem: dto.kilometragem ?? null,
            dataTrocaOleo: dto.dataTrocaOleo ? new Date(dto.dataTrocaOleo) : null,
            chassi: dto.chassi?.trim() || null,
            clienteDocumento: documento,
            ativo: true
        })
        .returning();
    const veiculo = inserted[0];

    if (!veiculo) {
        throw new AppError("Não foi possível criar o veículo", 500);
    }

    return getVeiculo(db, veiculo.id);
}

export async function updateVeiculo(
    db: AppDatabase,
    id: number,
    dto: {
        modelo?: string;
        placa?: string;
        tipo?: string | null;
        kilometragem?: number | null;
        dataTrocaOleo?: Date | string | null;
        chassi?: string | null;
        ativo?: boolean;
        clienteDocumento?: string;
    }
) {
    await getVeiculo(db, id);

    const patch: Record<string, unknown> = {};

    if (dto.modelo !== undefined) {
        patch.modelo = dto.modelo.trim();
    }

    if (dto.placa !== undefined) {
        patch.placa = dto.placa.trim().toUpperCase();
    }

    if (dto.tipo !== undefined) {
        patch.tipo = dto.tipo?.trim() || null;
    }

    if (dto.kilometragem !== undefined) {
        patch.kilometragem = dto.kilometragem;
    }

    if (dto.dataTrocaOleo !== undefined) {
        patch.dataTrocaOleo = dto.dataTrocaOleo ? new Date(dto.dataTrocaOleo) : null;
    }

    if (dto.chassi !== undefined) {
        patch.chassi = dto.chassi?.trim() || null;
    }

    if (dto.ativo !== undefined) {
        patch.ativo = dto.ativo;
    }

    if (dto.clienteDocumento !== undefined) {
        const documento = digitsOnly(dto.clienteDocumento);
        const clienteRows = await db.select().from(clientes).where(eq(clientes.documento, documento)).limit(1);

        if (!clienteRows[0]) {
            throw new AppError("Cliente não encontrado", 404, { clienteDocumento: "Cliente não encontrado" });
        }

        patch.clienteDocumento = documento;
    }

    if (Object.keys(patch).length > 0) {
        await db.update(veiculos).set(patch).where(eq(veiculos.id, id));
    }

    return getVeiculo(db, id);
}

export async function deleteVeiculo(db: AppDatabase, id: number) {
    const current = await getVeiculo(db, id);

    if (current.ordensServico.length > 0) {
        throw new AppError("Veículo ligado a ordem de serviço não pode ser excluído", 409);
    }

    await db.delete(veiculos).where(eq(veiculos.id, id));

    return current;
}
