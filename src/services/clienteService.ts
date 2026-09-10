import { eq } from "drizzle-orm";
import { digitsOnly } from "@shared/validators/mecarvit";
import type { AppDatabase } from "../config/database.js";
import {
    clientes,
    enderecos,
    enderecosCliente,
    itensServico,
    ordensServico,
    registrosEntradaSaida,
    veiculos
} from "../db/schema/index.js";
import { AppError } from "../utils/AppError.js";

export async function clienteTemVinculoOperacional(db: AppDatabase, documento: string): Promise<boolean> {
    const os = await db.select().from(ordensServico).where(eq(ordensServico.clienteDocumento, documento)).limit(1);

    if (os[0]) {
        return true;
    }

    const clienteVeiculos = await db.select().from(veiculos).where(eq(veiculos.clienteDocumento, documento));

    for (const veiculo of clienteVeiculos) {
        const osVeiculo = await db.select().from(ordensServico).where(eq(ordensServico.veiculoId, veiculo.id)).limit(1);

        if (osVeiculo[0]) {
            return true;
        }
    }

    const entradas = await db.select().from(registrosEntradaSaida);

    for (const registro of entradas) {
        const osRes = await db
            .select()
            .from(ordensServico)
            .where(eq(ordensServico.regEntradaSaidaId, registro.id))
            .limit(1);

        if (osRes[0]?.clienteDocumento === documento) {
            return true;
        }
    }

    for (const osRow of await db.select().from(ordensServico).where(eq(ordensServico.clienteDocumento, documento))) {
        const itens = await db.select().from(itensServico).where(eq(itensServico.ordemServicoId, osRow.id)).limit(1);

        if (itens[0]) {
            return true;
        }
    }

    return false;
}

async function replaceEnderecos(
    db: AppDatabase,
    documento: string,
    lista: Array<{
        estado: string;
        cidade: string;
        cep: string;
        bairro: string;
        rua: string;
        numero: number;
        complemento: string;
    }>
): Promise<void> {
    const atuais = await db
        .select()
        .from(enderecosCliente)
        .where(eq(enderecosCliente.clienteDocumento, documento));

    await db.delete(enderecosCliente).where(eq(enderecosCliente.clienteDocumento, documento));

    for (const link of atuais) {
        await db.delete(enderecos).where(eq(enderecos.id, link.enderecoId));
    }

    for (const item of lista) {
        const inserted = await db
            .insert(enderecos)
            .values({
                estado: item.estado.trim(),
                cidade: item.cidade.trim(),
                cep: item.cep.trim(),
                bairro: item.bairro.trim(),
                rua: item.rua.trim(),
                numero: Number(item.numero),
                complemento: item.complemento.trim()
            })
            .returning();
        const endereco = inserted[0];

        if (!endereco) {
            continue;
        }

        await db.insert(enderecosCliente).values({
            clienteDocumento: documento,
            enderecoId: endereco.id
        });
    }
}

export async function getClienteDetalhe(db: AppDatabase, documento: string) {
    const normalized = digitsOnly(documento);
    const rows = await db.select().from(clientes).where(eq(clientes.documento, normalized)).limit(1);
    const cliente = rows[0];

    if (!cliente) {
        throw new AppError("Cliente não encontrado", 404);
    }

    const links = await db
        .select()
        .from(enderecosCliente)
        .where(eq(enderecosCliente.clienteDocumento, normalized));
    const enderecoList = [];

    for (const link of links) {
        const found = await db.select().from(enderecos).where(eq(enderecos.id, link.enderecoId)).limit(1);

        if (found[0]) {
            enderecoList.push(found[0]);
        }
    }

    const veiculoList = await db.select().from(veiculos).where(eq(veiculos.clienteDocumento, normalized));
    const osList = await db.select().from(ordensServico).where(eq(ordensServico.clienteDocumento, normalized));

    return {
        ...cliente,
        enderecos: enderecoList,
        veiculos: veiculoList,
        ordensServico: osList
    };
}

export async function createCliente(
    db: AppDatabase,
    dto: {
        documento: string;
        nome: string;
        nomeSocial?: string;
        cel?: string;
        email?: string;
        obs?: string;
        usuarioCpf: string;
        ativo?: boolean;
        enderecos?: Array<{
            estado: string;
            cidade: string;
            cep: string;
            bairro: string;
            rua: string;
            numero: number;
            complemento: string;
        }>;
        veiculos?: Array<{
            modelo: string;
            placa: string;
            tipo?: string;
            kilometragem?: number;
            dataTrocaOleo?: Date | string;
            chassi?: string;
        }>;
    }
) {
    const documento = digitsOnly(dto.documento);
    const inserted = await db
        .insert(clientes)
        .values({
            documento,
            nome: dto.nome.trim(),
            nomeSocial: dto.nomeSocial?.trim() || null,
            cel: dto.cel?.trim() || null,
            email: dto.email?.trim().toLowerCase() || null,
            obs: dto.obs ?? null,
            usuarioCpf: dto.usuarioCpf,
            ativo: dto.ativo ?? true
        })
        .returning();
    const cliente = inserted[0];

    if (!cliente) {
        throw new AppError("Não foi possível criar o cliente", 500);
    }

    if (dto.enderecos) {
        await replaceEnderecos(db, documento, dto.enderecos);
    }

    if (dto.veiculos) {
        for (const veiculo of dto.veiculos) {
            await db.insert(veiculos).values({
                modelo: veiculo.modelo.trim(),
                placa: veiculo.placa.trim().toUpperCase(),
                tipo: veiculo.tipo?.trim() || null,
                kilometragem: veiculo.kilometragem ?? null,
                dataTrocaOleo: veiculo.dataTrocaOleo ? new Date(veiculo.dataTrocaOleo) : null,
                chassi: veiculo.chassi?.trim() || null,
                clienteDocumento: documento,
                ativo: true
            });
        }
    }

    return getClienteDetalhe(db, documento);
}

export async function updateCliente(
    db: AppDatabase,
    documento: string,
    dto: {
        nome?: string;
        nomeSocial?: string | null;
        cel?: string | null;
        email?: string | null;
        obs?: string | null;
        ativo?: boolean;
        enderecos?: Array<{
            estado: string;
            cidade: string;
            cep: string;
            bairro: string;
            rua: string;
            numero: number;
            complemento: string;
        }>;
        veiculos?: Array<{
            modelo: string;
            placa: string;
            tipo?: string;
            kilometragem?: number;
            dataTrocaOleo?: Date | string;
            chassi?: string;
        }>;
        replaceNested: boolean;
    }
) {
    const current = await getClienteDetalhe(db, documento);
    const patch: Record<string, unknown> = {};

    if (dto.nome !== undefined) {
        patch.nome = dto.nome.trim();
    }

    if (dto.nomeSocial !== undefined) {
        patch.nomeSocial = dto.nomeSocial?.trim() || null;
    }

    if (dto.cel !== undefined) {
        patch.cel = dto.cel?.trim() || null;
    }

    if (dto.email !== undefined) {
        patch.email = dto.email?.trim().toLowerCase() || null;
    }

    if (dto.obs !== undefined) {
        patch.obs = dto.obs;
    }

    if (dto.ativo !== undefined) {
        patch.ativo = dto.ativo;
    }

    if (Object.keys(patch).length > 0) {
        await db.update(clientes).set(patch).where(eq(clientes.documento, current.documento));
    }

    if (dto.enderecos !== undefined) {
        await replaceEnderecos(db, current.documento, dto.enderecos);
    }

    if (dto.veiculos !== undefined) {
        const existing = await db.select().from(veiculos).where(eq(veiculos.clienteDocumento, current.documento));

        for (const veiculo of existing) {
            const os = await db.select().from(ordensServico).where(eq(ordensServico.veiculoId, veiculo.id)).limit(1);

            if (os[0]) {
                throw new AppError("Não é possível substituir veículos ligados a ordens de serviço", 409);
            }
        }

        await db.delete(veiculos).where(eq(veiculos.clienteDocumento, current.documento));

        for (const veiculo of dto.veiculos) {
            await db.insert(veiculos).values({
                modelo: veiculo.modelo.trim(),
                placa: veiculo.placa.trim().toUpperCase(),
                tipo: veiculo.tipo?.trim() || null,
                kilometragem: veiculo.kilometragem ?? null,
                dataTrocaOleo: veiculo.dataTrocaOleo ? new Date(veiculo.dataTrocaOleo) : null,
                chassi: veiculo.chassi?.trim() || null,
                clienteDocumento: current.documento,
                ativo: true
            });
        }
    }

    return getClienteDetalhe(db, current.documento);
}

export async function deleteCliente(db: AppDatabase, documento: string) {
    const current = await getClienteDetalhe(db, documento);
    const vinculado = await clienteTemVinculoOperacional(db, current.documento);

    if (vinculado) {
        throw new AppError("Cliente possui histórico operacional e não pode ser excluído", 409, {
            documento: "Inative o cliente em vez de excluí-lo"
        });
    }

    await db.delete(veiculos).where(eq(veiculos.clienteDocumento, current.documento));
    await replaceEnderecos(db, current.documento, []);
    await db.delete(clientes).where(eq(clientes.documento, current.documento));

    return current;
}
