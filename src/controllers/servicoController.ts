import type { Request, Response } from "express";
import { validateServico } from "@shared/validators/mecarvit";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiFeatures } from "../utils/ApiFeatures.js";
import { parseId, requireDb } from "../utils/http.js";
import { throwIfInvalid, bodyOf } from "../utils/validate.js";
import { servicos } from "../db/schema/index.js";
import * as servicoService from "../services/servicoService.js";
import { notifyStaffCadastro } from "../realtime/mecarvitRealtime.js";

export const listServicos = catchAsync(async (req: Request, res: Response) => {
    const db = requireDb(req);
    const features = new ApiFeatures(db, servicos, req.query as Record<string, unknown>)
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

export const getServico = catchAsync(async (req: Request, res: Response) => {
    const servico = await servicoService.getServico(requireDb(req), parseId(req.params.id));

    res.status(200).json({ data: servico });
});

export const createServico = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);

    throwIfInvalid(validateServico(body, false));

    const created = await servicoService.createServico(requireDb(req), {
        nome: String(body.nome)
    });

    notifyStaffCadastro(req, "servico");
    res.status(201).json({ data: created });
});

export const updateServico = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);

    throwIfInvalid(validateServico(body, req.method === "PATCH"));

    const updated = await servicoService.updateServico(requireDb(req), parseId(req.params.id), {
        nome: body.nome as string | undefined
    });

    res.status(200).json({ data: updated });
});

export const deleteServico = catchAsync(async (req: Request, res: Response) => {
    await servicoService.deleteServico(requireDb(req), parseId(req.params.id));

    res.status(204).send();
});
