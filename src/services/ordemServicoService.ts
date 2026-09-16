import { eq } from "drizzle-orm";
import type { AppDatabase } from "../config/database.js";
import {
    clientes,
    itensServico,
    ordensServico,
    pagamentos,
    registrosEntradaSaida,
    responsaveis,
    servicos,
    STATUS_OS,
    statusOs,
    veiculos
} from "../db/schema/index.js";
import { AppError } from "../utils/AppError.js";
import * as servicoService from "./servicoService.js";
import { replacePagamentos, type PagamentoInput } from "./pagamentoSync.js";

type ItemInput = {
    servicoId: number;
    quantidade: number;
    valorObra: number;
    valorPecas?: number | null;
};

type ItemInputDto = {
    servicoId?: number;
    servicoNome?: string;
    quantidade: number;
    valorObra: number;
    valorPecas?: number | null;
};

function totalItens(itens: ItemInput[]): number {
    return itens.reduce((sum, item) => {
        const pecas = Number(item.valorPecas ?? 0);
        return sum + Number(item.quantidade) * (Number(item.valorObra) + pecas);
    }, 0);
}

export async function listStatusOs(db: AppDatabase) {
    return db.select().from(statusOs);
}

const PAYMENT_EPSILON = 0.009;

function isRegistroFullyPaid(valorRegistro: number, pagamentoRows: Array<{ valor: number }>): boolean {
    const paid = pagamentoRows.reduce((sum, row) => sum + Number(row.valor), 0);

    return paid + PAYMENT_EPSILON >= Number(valorRegistro);
}

/**
 * OS ids considered fully paid (or not) based on linked entrada and pagamentos.
 */
export async function listOrdemServicoIdsByPagamento(
    db: AppDatabase,
    fullyPaid: boolean
): Promise<number[]> {
    const rows = await db
        .select({
            id: ordensServico.id,
            regEntradaSaidaId: ordensServico.regEntradaSaidaId
        })
        .from(ordensServico);
    const paid: number[] = [];
    const unpaid: number[] = [];

    for (const row of rows) {
        if (!row.regEntradaSaidaId) {
            unpaid.push(row.id);
            continue;
        }

        const resRows = await db
            .select()
            .from(registrosEntradaSaida)
            .where(eq(registrosEntradaSaida.id, row.regEntradaSaidaId))
            .limit(1);
        const registro = resRows[0];

        if (!registro) {
            unpaid.push(row.id);
            continue;
        }

        const pagamentoRows = await loadPagamentos(db, row.regEntradaSaidaId);

        if (isRegistroFullyPaid(registro.valor, pagamentoRows)) {
            paid.push(row.id);
        } else {
            unpaid.push(row.id);
        }
    }

    return fullyPaid ? paid : unpaid;
}

async function requireCliente(db: AppDatabase, documento: string) {
    const rows = await db.select().from(clientes).where(eq(clientes.documento, documento)).limit(1);
    const cliente = rows[0];

    if (!cliente) {
        throw new AppError("Cliente não encontrado", 404, { clienteDocumento: "Cliente não encontrado" });
    }

    return cliente;
}

async function requireVeiculoDoCliente(db: AppDatabase, veiculoId: number, clienteDocumento: string) {
    const rows = await db.select().from(veiculos).where(eq(veiculos.id, veiculoId)).limit(1);
    const veiculo = rows[0];

    if (!veiculo) {
        throw new AppError("Veículo não encontrado", 404, { veiculoId: "Veículo não encontrado" });
    }

    if (veiculo.clienteDocumento !== clienteDocumento) {
        throw new AppError("Veículo não pertence ao cliente", 400, {
            veiculoId: "O veículo deve pertencer ao cliente da OS"
        });
    }

    return veiculo;
}

async function resolveItens(db: AppDatabase, items: ItemInputDto[]): Promise<ItemInput[]> {
    const resolved: ItemInput[] = [];

    for (const item of items) {
        let servicoId = item.servicoId;

        if (!servicoId || !Number.isInteger(servicoId) || servicoId <= 0) {
            const servico = await servicoService.findOrCreateServicoByNome(
                db,
                String(item.servicoNome ?? "")
            );
            servicoId = servico.id;
        }

        resolved.push({
            servicoId,
            quantidade: Number(item.quantidade),
            valorObra: Number(item.valorObra),
            valorPecas: item.valorPecas == null ? null : Number(item.valorPecas)
        });
    }

    return resolved;
}

async function loadItens(db: AppDatabase, osId: number): Promise<ItemInput[]> {
    const rows = await db.select().from(itensServico).where(eq(itensServico.ordemServicoId, osId));

    return rows.map((row) => ({
        servicoId: row.servicoId,
        quantidade: row.quantidade,
        valorObra: row.valorObra,
        valorPecas: row.valorPecas
    }));
}

async function loadPagamentos(db: AppDatabase, resId: number | null) {
    if (!resId) {
        return [];
    }

    return db.select().from(pagamentos).where(eq(pagamentos.regEntradaSaidaId, resId));
}

async function replaceItens(db: AppDatabase, osId: number, itens: ItemInput[]): Promise<void> {
    await db.delete(itensServico).where(eq(itensServico.ordemServicoId, osId));

    for (const item of itens) {
        await db.insert(itensServico).values({
            ordemServicoId: osId,
            servicoId: Number(item.servicoId),
            quantidade: Number(item.quantidade),
            valorObra: Number(item.valorObra),
            valorPecas: item.valorPecas == null ? null : Number(item.valorPecas)
        });
    }
}

async function replaceResponsaveis(db: AppDatabase, osId: number, cpfs: string[]): Promise<void> {
    await db.delete(responsaveis).where(eq(responsaveis.ordemServicoId, osId));

    const unique = [...new Set(cpfs)];

    for (const cpf of unique) {
        await db.insert(responsaveis).values({
            ordemServicoId: osId,
            usuarioCpf: cpf
        });
    }
}

async function syncFinanceiro(
    db: AppDatabase,
    osId: number,
    actorCpf: string,
    options: { pagamentos?: PagamentoInput[]; replacePagamentos: boolean }
): Promise<void> {
    const osRows = await db.select().from(ordensServico).where(eq(ordensServico.id, osId)).limit(1);
    const os = osRows[0];

    if (!os) {
        throw new AppError("Ordem de serviço não encontrada", 404);
    }

    const cliente = await requireCliente(db, os.clienteDocumento);
    const itens = await loadItens(db, osId);
    const valor = Number(totalItens(itens).toFixed(2));
    const currentPagamentos = await loadPagamentos(db, os.regEntradaSaidaId);
    const nextPagamentos = options.pagamentos
        ? options.replacePagamentos
            ? options.pagamentos
            : [
                ...currentPagamentos.map((row) => ({
                    id: row.id,
                    tipo: row.tipo,
                    valor: row.valor
                })),
                ...options.pagamentos
            ]
        : currentPagamentos.map((row) => ({
            id: row.id,
            tipo: row.tipo,
            valor: row.valor
        }));
    const hasPagamentos = nextPagamentos.length > 0;
    const concluida = os.statusOsId === STATUS_OS.CONCLUIDA;
    const shouldHaveRes = hasPagamentos || concluida;

    if (!shouldHaveRes) {
        if (os.regEntradaSaidaId) {
            const resId = os.regEntradaSaidaId;

            await db.update(ordensServico).set({ regEntradaSaidaId: null }).where(eq(ordensServico.id, osId));
            await db.delete(pagamentos).where(eq(pagamentos.regEntradaSaidaId, resId));
            await db.delete(registrosEntradaSaida).where(eq(registrosEntradaSaida.id, resId));
        }

        return;
    }

    const payload = {
        nome: `OS de ${cliente.nome}`,
        tipo: "entrada" as const,
        valor,
        usuarioCpf: actorCpf,
        descricao: os.obs ?? null
    };

    let resId = os.regEntradaSaidaId;

    if (!resId) {
        const inserted = await db.insert(registrosEntradaSaida).values(payload).returning();
        const created = inserted[0];

        if (!created) {
            throw new AppError("Não foi possível gerar o registro financeiro", 500);
        }

        resId = created.id;
        await db.update(ordensServico).set({ regEntradaSaidaId: resId }).where(eq(ordensServico.id, osId));
    } else {
        await db.update(registrosEntradaSaida).set(payload).where(eq(registrosEntradaSaida.id, resId));
    }

    if (options.pagamentos) {
        await replacePagamentos(db, resId, nextPagamentos);
    }
}

export async function getOrdemServico(db: AppDatabase, id: number) {
    const rows = await db.select().from(ordensServico).where(eq(ordensServico.id, id)).limit(1);
    const os = rows[0];

    if (!os) {
        throw new AppError("Ordem de serviço não encontrada", 404);
    }

    const itens = await db
        .select({
            quantidade: itensServico.quantidade,
            valorPecas: itensServico.valorPecas,
            valorObra: itensServico.valorObra,
            ordemServicoId: itensServico.ordemServicoId,
            servicoId: itensServico.servicoId,
            servicoNome: servicos.nome
        })
        .from(itensServico)
        .innerJoin(servicos, eq(itensServico.servicoId, servicos.id))
        .where(eq(itensServico.ordemServicoId, id));
    const responsavelRows = await db.select().from(responsaveis).where(eq(responsaveis.ordemServicoId, id));
    const statusRows = await db.select().from(statusOs).where(eq(statusOs.id, os.statusOsId)).limit(1);
    const pagamentoRows = await loadPagamentos(db, os.regEntradaSaidaId);
    let registro = null;

    if (os.regEntradaSaidaId) {
        const resRows = await db
            .select()
            .from(registrosEntradaSaida)
            .where(eq(registrosEntradaSaida.id, os.regEntradaSaidaId))
            .limit(1);
        registro = resRows[0] ?? null;
    }

    return {
        ...os,
        status: statusRows[0] ?? null,
        itens,
        responsaveis: responsavelRows.map((row) => row.usuarioCpf),
        pagamentos: pagamentoRows,
        registroEntradaSaida: registro
            ? { ...registro, pagamentos: pagamentoRows }
            : null,
        total: totalItens(itens)
    };
}

function assertStatusTransition(
    fromStatus: number,
    toStatus: number,
    pagamentoCount: number
): void {
    const leavingConcluida = fromStatus === STATUS_OS.CONCLUIDA && toStatus !== STATUS_OS.CONCLUIDA;
    const cancelling = toStatus === STATUS_OS.CANCELADA && fromStatus !== STATUS_OS.CANCELADA;

    if ((leavingConcluida || cancelling) && pagamentoCount > 0) {
        throw new AppError("Não é possível alterar o status de uma OS com pagamentos lançados", 409, {
            statusOsId: "Cancele ou estorne os pagamentos antes de reabrir ou cancelar"
        });
    }
}

export async function createOrdemServico(
    db: AppDatabase,
    dto: {
        clienteDocumento: string;
        veiculoId: number;
        statusOsId?: number;
        diagnosticoCliente?: string;
        diagnosticoMecanico?: string;
        obs?: string;
        dataInicio?: Date | string;
        dataConclusao?: Date | string;
        itens?: ItemInputDto[];
        responsaveis?: string[];
        pagamentos?: PagamentoInput[];
        actorCpf: string;
    }
) {
    const cliente = await requireCliente(db, dto.clienteDocumento);
    await requireVeiculoDoCliente(db, dto.veiculoId, cliente.documento);

    const statusOsId = dto.statusOsId ?? STATUS_OS.ABERTA;
    const statusRows = await db.select().from(statusOs).where(eq(statusOs.id, statusOsId)).limit(1);

    if (!statusRows[0]) {
        throw new AppError("Status inválido", 400, { statusOsId: "Status inválido" });
    }

    const inserted = await db
        .insert(ordensServico)
        .values({
            clienteDocumento: cliente.documento,
            veiculoId: dto.veiculoId,
            statusOsId,
            diagnosticoCliente: dto.diagnosticoCliente ?? null,
            diagnosticoMecanico: dto.diagnosticoMecanico ?? null,
            obs: dto.obs ?? null,
            dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : new Date(),
            dataConclusao: statusOsId === STATUS_OS.CONCLUIDA
                ? (dto.dataConclusao ? new Date(dto.dataConclusao) : new Date())
                : dto.dataConclusao
                    ? new Date(dto.dataConclusao)
                    : null
        })
        .returning();
    const os = inserted[0];

    if (!os) {
        throw new AppError("Não foi possível criar a ordem de serviço", 500);
    }

    if (dto.itens) {
        await replaceItens(db, os.id, await resolveItens(db, dto.itens));
    }

    if (dto.responsaveis) {
        await replaceResponsaveis(db, os.id, dto.responsaveis);
    }

    await syncFinanceiro(db, os.id, dto.actorCpf, {
        pagamentos: dto.pagamentos,
        replacePagamentos: true
    });

    return getOrdemServico(db, os.id);
}

export async function updateOrdemServico(
    db: AppDatabase,
    id: number,
    dto: {
        clienteDocumento?: string;
        veiculoId?: number;
        statusOsId?: number;
        diagnosticoCliente?: string | null;
        diagnosticoMecanico?: string | null;
        obs?: string | null;
        dataInicio?: Date | string | null;
        dataConclusao?: Date | string | null;
        itens?: ItemInputDto[];
        responsaveis?: string[];
        pagamentos?: PagamentoInput[];
        replaceNested: boolean;
        actorCpf: string;
    }
) {
    const current = await getOrdemServico(db, id);
    const nextCliente = dto.clienteDocumento ?? current.clienteDocumento;
    const nextVeiculo = dto.veiculoId ?? current.veiculoId;
    const cliente = await requireCliente(db, nextCliente);

    await requireVeiculoDoCliente(db, nextVeiculo, cliente.documento);

    if (dto.statusOsId !== undefined && dto.statusOsId !== current.statusOsId) {
        const statusRows = await db.select().from(statusOs).where(eq(statusOs.id, dto.statusOsId)).limit(1);

        if (!statusRows[0]) {
            throw new AppError("Status inválido", 400, { statusOsId: "Status inválido" });
        }

        assertStatusTransition(current.statusOsId, dto.statusOsId, current.pagamentos.length);
    }

    const patch: Record<string, unknown> = {};

    if (dto.clienteDocumento !== undefined) {
        patch.clienteDocumento = cliente.documento;
    }

    if (dto.veiculoId !== undefined) {
        patch.veiculoId = dto.veiculoId;
    }

    if (dto.statusOsId !== undefined) {
        patch.statusOsId = dto.statusOsId;
        patch.dataConclusao = dto.statusOsId === STATUS_OS.CONCLUIDA
            ? (dto.dataConclusao ? new Date(dto.dataConclusao) : new Date())
            : dto.dataConclusao === undefined
                ? null
                : dto.dataConclusao
                    ? new Date(dto.dataConclusao)
                    : null;
    } else if (dto.dataConclusao !== undefined) {
        patch.dataConclusao = dto.dataConclusao ? new Date(dto.dataConclusao) : null;
    }

    if (dto.diagnosticoCliente !== undefined) {
        patch.diagnosticoCliente = dto.diagnosticoCliente;
    }

    if (dto.diagnosticoMecanico !== undefined) {
        patch.diagnosticoMecanico = dto.diagnosticoMecanico;
    }

    if (dto.obs !== undefined) {
        patch.obs = dto.obs;
    }

    if (dto.dataInicio !== undefined) {
        patch.dataInicio = dto.dataInicio ? new Date(dto.dataInicio) : null;
    }

    if (Object.keys(patch).length > 0) {
        await db.update(ordensServico).set(patch).where(eq(ordensServico.id, id));
    }

    if (dto.itens !== undefined) {
        await replaceItens(db, id, await resolveItens(db, dto.itens));
    }

    if (dto.responsaveis !== undefined) {
        await replaceResponsaveis(db, id, dto.responsaveis);
    }

    await syncFinanceiro(db, id, dto.actorCpf, {
        pagamentos: dto.pagamentos,
        replacePagamentos: Boolean(dto.replaceNested && dto.pagamentos !== undefined)
    });

    return getOrdemServico(db, id);
}

export async function deleteOrdemServico(db: AppDatabase, id: number) {
    const current = await getOrdemServico(db, id);
    const temHistorico =
        current.itens.length > 0 ||
        current.pagamentos.length > 0 ||
        current.regEntradaSaidaId != null ||
        current.registroEntradaSaida != null;

    if (temHistorico) {
        throw new AppError("Ordem de serviço com histórico operacional não pode ser excluída", 409, {
            id: "OS com itens, pagamentos ou registro de entrada/saída permanece no banco"
        });
    }

    await db.delete(ordensServico).where(eq(ordensServico.id, id));

    return current;
}
