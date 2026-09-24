import type { Request, Response } from "express";
import { validateOrdemServico } from "@shared/validators/mecarvit";
import { PERMISSIONS, hasPermission } from "@shared/mecarvit/access";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";
import { ApiFeatures } from "../utils/ApiFeatures.js";
import { parseId, requireDb, requireUser } from "../utils/http.js";
import { throwIfInvalid, bodyOf } from "../utils/validate.js";
import { clientes, ordensServico, registrosEntradaSaida, statusOs, veiculos } from "../db/schema/index.js";
import * as ordemServicoService from "../services/ordemServicoService.js";
import { asItens, asPagamentos, asResponsaveis, bodyOptionalString, isPagamentosOnlyBody } from "../utils/nested.js";
import { eq, inArray, isNull, like, or, sql, and, gte, lte, type SQL } from "drizzle-orm";
import { utcDayRange } from "../utils/utcDayRange.js";

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
    const dataLimiteRaw = queryStringValue(query, "dataLimitePagamento")?.trim();

    delete query.cliente;
    delete query.veiculo;
    delete query.paga;
    delete query.dataLimitePagamento;

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

    if (dataLimiteRaw) {
        const { start, end } = utcDayRange(dataLimiteRaw);
        const matched = await db
            .select({ id: registrosEntradaSaida.id })
            .from(registrosEntradaSaida)
            .where(
                and(
                    gte(registrosEntradaSaida.dataLimitePagamento, start),
                    lte(registrosEntradaSaida.dataLimitePagamento, end)
                ) as SQL
            );
        const registroIds = matched.map((row) => row.id);

        // Mirrors `osDataLimitePagamento` on the client: while the OS has no
        // record yet, its own column holds the deadline; once the record
        // exists, only the record counts.
        const pendingMatch = and(
            isNull(ordensServico.regEntradaSaidaId),
            gte(ordensServico.dataLimitePagamento, start),
            lte(ordensServico.dataLimitePagamento, end)
        ) as SQL;

        features.whereExtra(
            registroIds.length > 0
                ? (or(pendingMatch, inArray(ordensServico.regEntradaSaidaId, registroIds)) as SQL)
                : pendingMatch
        );
    }

    const rows = await features.exec();
    const total = await features.count();
    const data = [];

    for (const row of rows) {
        data.push(
            ordemServicoService.presentOrdemServico(
                await ordemServicoService.getOrdemServico(db, Number(row.id)),
                requireUser(req).nivelAcesso
            )
        );
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

    res.status(200).json({
        data: ordemServicoService.presentOrdemServico(os, requireUser(req).nivelAcesso)
    });
});

export const createOs = catchAsync(async (req: Request, res: Response) => {
    const actor = requireUser(req);

    if (!hasPermission(actor.nivelAcesso, PERMISSIONS.os.criar)) {
        throw new AppError("Permissão insuficiente", 403);
    }

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
        dataLimitePagamento: bodyOptionalString(body, "dataLimitePagamento"),
        itens: asItens(body.itens),
        responsaveis: asResponsaveis(body.responsaveis),
        pagamentos: asPagamentos(body.pagamentos),
        actorCpf: actor.cpf
    });

    res.status(201).json({
        data: ordemServicoService.presentOrdemServico(created, actor.nivelAcesso)
    });
});

export const updateOs = catchAsync(async (req: Request, res: Response) => {
    const actor = requireUser(req);
    const body = bodyOf(req);
    const pagamentosOnly = isPagamentosOnlyBody(body);
    const canCreate = hasPermission(actor.nivelAcesso, PERMISSIONS.os.criar);
    const canPay = hasPermission(actor.nivelAcesso, PERMISSIONS.os.pagamentos);

    if (pagamentosOnly && !canPay) {
        throw new AppError("Permissão insuficiente", 403);
    }

    throwIfInvalid(
        validateOrdemServico(body, {
            partial: req.method === "PATCH" || pagamentosOnly || !canCreate
        })
    );

    const limited = !canCreate;
    const updated = await ordemServicoService.updateOrdemServico(
        requireDb(req),
        parseId(req.params.id),
        limited
            ? {
                diagnosticoMecanico: bodyOptionalString(body, "diagnosticoMecanico"),
                obs: bodyOptionalString(body, "obs", "observacao"),
                replaceNested: false,
                actorCpf: actor.cpf
            }
            : {
                clienteDocumento: body.clienteDocumento as string | undefined,
                veiculoId: body.veiculoId === undefined ? undefined : Number(body.veiculoId),
                statusOsId: body.statusOsId === undefined ? undefined : Number(body.statusOsId),
                diagnosticoCliente: bodyOptionalString(body, "diagnosticoCliente"),
                diagnosticoMecanico: bodyOptionalString(body, "diagnosticoMecanico"),
                obs: bodyOptionalString(body, "obs", "observacao"),
                dataInicio: bodyOptionalString(body, "dataInicio"),
                dataConclusao: bodyOptionalString(body, "dataConclusao"),
                dataLimitePagamento: bodyOptionalString(body, "dataLimitePagamento"),
                itens: asItens(body.itens),
                responsaveis: asResponsaveis(body.responsaveis),
                pagamentos: canPay ? asPagamentos(body.pagamentos) : undefined,
                replaceNested: req.method === "PUT",
                actorCpf: actor.cpf
            }
    );

    res.status(200).json({
        data: ordemServicoService.presentOrdemServico(updated, actor.nivelAcesso)
    });
});

export const deleteOs = catchAsync(async (req: Request, res: Response) => {
    const actor = requireUser(req);

    if (!hasPermission(actor.nivelAcesso, PERMISSIONS.os.excluir)) {
        throw new AppError("Permissão insuficiente", 403);
    }

    await ordemServicoService.deleteOrdemServico(requireDb(req), parseId(req.params.id));

    res.status(204).send();
});
