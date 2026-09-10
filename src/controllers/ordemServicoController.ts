import type { Request, Response } from "express";
import { validateOrdemServico } from "@shared/validators/mecarvit";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiFeatures } from "../utils/ApiFeatures.js";
import { parseId, requireDb, requireUser } from "../utils/http.js";
import { throwIfInvalid, bodyOf } from "../utils/validate.js";
import { ordensServico, statusOs } from "../db/schema/index.js";
import * as ordemServicoService from "../services/ordemServicoService.js";
import { asItens, asPagamentos, asResponsaveis } from "../utils/nested.js";

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

export const listOrdens = catchAsync(async (req: Request, res: Response) => {
    const db = requireDb(req);
    const features = new ApiFeatures(db, ordensServico, req.query as Record<string, unknown>)
        .filter()
        .sort()
        .limitFields()
        .paginate();
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
        diagnosticoCliente: body.diagnosticoCliente as string | undefined,
        diagnosticoMecanico: body.diagnosticoMecanico as string | undefined,
        obs: (body.obs ?? body.observacao) as string | undefined,
        itens: asItens(body.itens),
        responsaveis: asResponsaveis(body.responsaveis),
        pagamentos: asPagamentos(body.pagamentos),
        actorCpf: requireUser(req).cpf
    });

    res.status(201).json({ data: created });
});

export const updateOs = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);

    throwIfInvalid(validateOrdemServico(body, { partial: req.method === "PATCH" }));

    const updated = await ordemServicoService.updateOrdemServico(
        requireDb(req),
        parseId(req.params.id),
        {
            clienteDocumento: body.clienteDocumento as string | undefined,
            veiculoId: body.veiculoId === undefined ? undefined : Number(body.veiculoId),
            statusOsId: body.statusOsId === undefined ? undefined : Number(body.statusOsId),
            diagnosticoCliente: body.diagnosticoCliente as string | undefined,
            diagnosticoMecanico: body.diagnosticoMecanico as string | undefined,
            obs: (body.obs ?? body.observacao) as string | undefined,
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
