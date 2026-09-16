import type { Request, Response } from "express";
import { validateOrdemServico } from "@shared/validators/mecarvit";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiFeatures } from "../utils/ApiFeatures.js";
import { parseId, requireDb, requireUser } from "../utils/http.js";
import { throwIfInvalid, bodyOf } from "../utils/validate.js";
import { clientes, ordensServico, statusOs, veiculos } from "../db/schema/index.js";
import * as ordemServicoService from "../services/ordemServicoService.js";
import { asItens, asPagamentos, asResponsaveis, bodyOptionalString, isPagamentosOnlyBody } from "../utils/nested.js";
import { eq, inArray, like, or, sql } from "drizzle-orm";

export const listStatusOs = catchAsync(async (req: Request, res: Response) => {
    const db = requireDb(req);
    const features = new ApiFeatures(db, statusOs, req.query as Record<string, unknown>)
        .filter()
        .sort()
        .limitFields()
        .paginate();
    const data = await features.exec();
    const total = await features.count();

    res.status(200).json({
        data,
        page: features.pagination.page,
        limit: features.pagination.limit,
        total
    });
});

function queryStringValue(query: Record<string, unknown>, key: string): string | undefined {
    const raw = query[key];

    if (typeof raw === "string") {
        return raw;
    }

    if (Array.isArray(raw)) {
        return raw[raw.length - 1] as string;
    }

    return undefined;
}

export const listOrdens = catchAsync(async (req: Request, res: Response) => {
    const db = requireDb(req);
    const query = { ...(req.query as Record<string, unknown>) };
    const clienteFilter = queryStringValue(query, "cliente")?.trim();
    const veiculoFilter = queryStringValue(query, "veiculo")?.trim();
    const pagaFilter = queryStringValue(query, "paga")?.trim().toLowerCase();

    delete query.cliente;
    delete query.veiculo;
    delete query.paga;

    const features = new ApiFeatures(db, ordensServico, query)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    if (clienteFilter) {
        const needle = `%${clienteFilter.toLowerCase()}%`;
        const matched = await db
            .select({ documento: clientes.documento })
            .from(clientes)
            .where(
                or(
                    like(sql`lower(${clientes.nome})`, needle),
                    like(sql`lower(${clientes.documento})`, needle)
                )
            );
        const documentos = matched.map((row) => row.documento);

        if (documentos.length === 0) {
            res.status(200).json({
                data: [],
                page: features.pagination.page,
                limit: features.pagination.limit,
                total: 0
            });

            return;
        }

        features.whereExtra(inArray(ordensServico.clienteDocumento, documentos));
    }

    if (veiculoFilter) {
        const ids: number[] = [];

        if (/^\d+$/.test(veiculoFilter)) {
            const id = Number(veiculoFilter);

            if (Number.isInteger(id) && id > 0) {
                const byId = await db
                    .select({ id: veiculos.id })
                    .from(veiculos)
                    .where(eq(veiculos.id, id))
                    .limit(1);

                if (byId[0]) {
                    ids.push(byId[0].id);
                }
            }
        } else {
            const needle = `%${veiculoFilter.toLowerCase()}%`;
            const matched = await db
                .select({ id: veiculos.id })
                .from(veiculos)
                .where(
                    or(
                        like(sql`lower(${veiculos.modelo})`, needle),
                        like(sql`lower(${veiculos.placa})`, needle)
                    )
                );
            ids.push(...matched.map((row) => row.id));
        }

        if (ids.length === 0) {
            res.status(200).json({
                data: [],
                page: features.pagination.page,
                limit: features.pagination.limit,
                total: 0
            });

            return;
        }

        features.whereExtra(inArray(ordensServico.veiculoId, ids));
    }

    if (pagaFilter === "sim" || pagaFilter === "nao") {
        const paidIds = await ordemServicoService.listOrdemServicoIdsByPagamento(db, true);
        const unpaidIds = await ordemServicoService.listOrdemServicoIdsByPagamento(db, false);
        const target = pagaFilter === "sim" ? paidIds : unpaidIds;

        if (target.length === 0) {
            res.status(200).json({
                data: [],
                page: features.pagination.page,
                limit: features.pagination.limit,
                total: 0
            });

            return;
        }

        features.whereExtra(inArray(ordensServico.id, target));
    }

    const rows = await features.exec();
    const total = await features.count();
    const data = [];

    for (const row of rows) {
        data.push(await ordemServicoService.getOrdemServico(db, Number(row.id)));
    }

    res.status(200).json({
        data,
        page: features.pagination.page,
        limit: features.pagination.limit,
        total
    });
});

export const getOs = catchAsync(async (req: Request, res: Response) => {
    const os = await ordemServicoService.getOrdemServico(requireDb(req), parseId(req.params.id));

    res.status(200).json({ data: os });
});

export const createOs = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);

    throwIfInvalid(validateOrdemServico(body, { partial: false }));

    const created = await ordemServicoService.createOrdemServico(requireDb(req), {
        clienteDocumento: String(body.clienteDocumento),
        veiculoId: Number(body.veiculoId),
        statusOsId: body.statusOsId === undefined ? undefined : Number(body.statusOsId),
        diagnosticoCliente: bodyOptionalString(body, "diagnosticoCliente"),
        diagnosticoMecanico: bodyOptionalString(body, "diagnosticoMecanico"),
        obs: bodyOptionalString(body, "obs", "observacao"),
        dataInicio: bodyOptionalString(body, "dataInicio"),
        dataConclusao: bodyOptionalString(body, "dataConclusao"),
        itens: asItens(body.itens),
        responsaveis: asResponsaveis(body.responsaveis),
        pagamentos: asPagamentos(body.pagamentos),
        actorCpf: requireUser(req).cpf
    });

    res.status(201).json({ data: created });
});

export const updateOs = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);
    const pagamentosOnly = isPagamentosOnlyBody(body);

    throwIfInvalid(
        validateOrdemServico(body, {
            partial: req.method === "PATCH" || pagamentosOnly
        })
    );

    const updated = await ordemServicoService.updateOrdemServico(
        requireDb(req),
        parseId(req.params.id),
        {
            clienteDocumento: body.clienteDocumento as string | undefined,
            veiculoId: body.veiculoId === undefined ? undefined : Number(body.veiculoId),
            statusOsId: body.statusOsId === undefined ? undefined : Number(body.statusOsId),
            diagnosticoCliente: bodyOptionalString(body, "diagnosticoCliente"),
            diagnosticoMecanico: bodyOptionalString(body, "diagnosticoMecanico"),
            obs: bodyOptionalString(body, "obs", "observacao"),
            dataInicio: bodyOptionalString(body, "dataInicio"),
            dataConclusao: bodyOptionalString(body, "dataConclusao"),
            itens: asItens(body.itens),
            responsaveis: asResponsaveis(body.responsaveis),
            pagamentos: asPagamentos(body.pagamentos),
            replaceNested: req.method === "PUT",
            actorCpf: requireUser(req).cpf
        }
    );

    res.status(200).json({ data: updated });
});

export const deleteOs = catchAsync(async (req: Request, res: Response) => {
    await ordemServicoService.deleteOrdemServico(requireDb(req), parseId(req.params.id));

    res.status(204).send();
});
