import type { Request, Response } from "express";
import { validateRegEntradaSaida } from "@shared/validators/mecarvit";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiFeatures } from "../utils/ApiFeatures.js";
import { parseId, requireDb, requireUser } from "../utils/http.js";
import { throwIfInvalid, bodyOf } from "../utils/validate.js";
import { utcDayRange } from "../utils/utcDayRange.js";
import { ordensServico, registrosEntradaSaida } from "../db/schema/index.js";
import * as registroService from "../services/registroService.js";
import { AppError } from "../utils/AppError.js";
import { asPagamentos, isPagamentosOnlyBody } from "../utils/nested.js";
import { inArray, and, gte, lte, type SQL } from "drizzle-orm";
import { parsePagamentoSituacaoFilter } from "@shared/mecarvit/pagamentoSituacao";

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

export const listRegistros = catchAsync(async (req: Request, res: Response) => {
    const db = requireDb(req);
    const query = { ...(req.query as Record<string, unknown>) };
    const ordemServicoRaw = queryStringValue(query, "ordemServicoId");
    const pagamentoSituacaoRaw = queryStringValue(query, "pagamentoSituacao")?.trim();
    const dataLimiteRaw = queryStringValue(query, "dataLimitePagamento")?.trim();

    delete query.ordemServicoId;
    delete query.pagamentoSituacao;
    delete query.pago;
    delete query.dataLimitePagamento;

    const features = new ApiFeatures(db, registrosEntradaSaida, query)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    if (ordemServicoRaw?.trim()) {
        const osIds = ordemServicoRaw
            .split(",")
            .map((part) => Number(part.trim()))
            .filter((id) => Number.isInteger(id) && id > 0);

        if (osIds.length === 0) {
            res.status(200).json({
                data: [],
                page: features.pagination.page,
                limit: features.pagination.limit,
                total: 0
            });

            return;
        }

        const links = await db
            .select({ regEntradaSaidaId: ordensServico.regEntradaSaidaId })
            .from(ordensServico)
            .where(inArray(ordensServico.id, osIds));
        const registroIds = links
            .map((row) => row.regEntradaSaidaId)
            .filter((id): id is number => id != null);

        if (registroIds.length === 0) {
            res.status(200).json({
                data: [],
                page: features.pagination.page,
                limit: features.pagination.limit,
                total: 0
            });

            return;
        }

        features.whereExtra(inArray(registrosEntradaSaida.id, registroIds));
    }

    const pagamentoSituacaoFilter = parsePagamentoSituacaoFilter(pagamentoSituacaoRaw);

    if (pagamentoSituacaoFilter) {
        const target = await registroService.listRegistroIdsByPagamentoSituacao(
            db,
            pagamentoSituacaoFilter
        );

        if (target.length === 0) {
            res.status(200).json({
                data: [],
                page: features.pagination.page,
                limit: features.pagination.limit,
                total: 0
            });

            return;
        }

        features.whereExtra(inArray(registrosEntradaSaida.id, target));
    }

    if (dataLimiteRaw) {
        const { start, end } = utcDayRange(dataLimiteRaw);

        features.whereExtra(
            and(
                gte(registrosEntradaSaida.dataLimitePagamento, start),
                lte(registrosEntradaSaida.dataLimitePagamento, end)
            ) as SQL
        );
    }

    const rows = await features.exec();
    const total = await features.count();
    const data = [];

    for (const row of rows) {
        data.push(await registroService.getRegistro(db, Number(row.id)));
    }

    res.status(200).json({
        data,
        page: features.pagination.page,
        limit: features.pagination.limit,
        total
    });
});

export const getRegistro = catchAsync(async (req: Request, res: Response) => {
    const registro = await registroService.getRegistro(requireDb(req), parseId(req.params.id));

    res.status(200).json({ data: registro });
});

export const createRegistro = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);

    throwIfInvalid(validateRegEntradaSaida(body, { partial: false }));

    const created = await registroService.createRegistro(requireDb(req), {
        tipo: String(body.tipo),
        nome: String(body.nome),
        valor: Number(body.valor),
        descricao: (body.descricao ?? body.observacao) as string | undefined,
        dataLimitePagamento: body.dataLimitePagamento as string | undefined,
        usuarioCpf: requireUser(req).cpf,
        pagamentos: asPagamentos(body.pagamentos)
    });

    res.status(201).json({ data: created });
});

export const updateRegistro = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);
    const pagamentosOnly = isPagamentosOnlyBody(body);

    throwIfInvalid(
        validateRegEntradaSaida(body, {
            partial: req.method !== "POST" || pagamentosOnly
        })
    );

    const updated = await registroService.updateRegistro(
        requireDb(req),
        parseId(req.params.id),
        {
            tipo: body.tipo === undefined ? undefined : String(body.tipo),
            nome: body.nome as string | undefined,
            valor: body.valor === undefined ? undefined : Number(body.valor),
            descricao: (body.descricao ?? body.observacao) as string | null | undefined,
            dataLimitePagamento: body.dataLimitePagamento as string | null | undefined,
            pagamentos: asPagamentos(body.pagamentos),
            replaceNested: req.method === "PUT"
        }
    );

    res.status(200).json({ data: updated });
});

export const deleteRegistro = catchAsync(async (req: Request, res: Response) => {
    await registroService.deleteRegistro(requireDb(req), parseId(req.params.id));

    res.status(204).send();
});

export const dashboardOsStatus = catchAsync(async (req: Request, res: Response) => {
    const data = await registroService.resumoOsStatus(requireDb(req));

    res.status(200).json({ data });
});

export const dashboardFluxoMensal = catchAsync(async (req: Request, res: Response) => {
    const raw = req.query.ano;
    const ano = raw === undefined ? new Date().getFullYear() : Number(raw);

    if (!Number.isInteger(ano) || ano < 1900 || ano > 2100) {
        throw new AppError("ano inválido", 400, { ano: "ano deve ser um inteiro válido" });
    }

    const data = await registroService.fluxoMensal(requireDb(req), ano);

    res.status(200).json({ data });
});
