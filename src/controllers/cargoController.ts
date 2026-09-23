import type { Request, Response } from "express";
import { validateCargo } from "@shared/validators/mecarvit";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiFeatures } from "../utils/ApiFeatures.js";
import { parseId, requireDb } from "../utils/http.js";
import { throwIfInvalid, bodyOf } from "../utils/validate.js";
import { cargos } from "../db/schema/index.js";
import * as cargoService from "../services/cargoService.js";
import { notifyStaffCadastro } from "../realtime/mecarvitRealtime.js";

export const listCargos = catchAsync(async (req: Request, res: Response) => {
    const db = requireDb(req);
    const features = new ApiFeatures(db, cargos, req.query as Record<string, unknown>)
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

export const getCargo = catchAsync(async (req: Request, res: Response) => {
    const cargo = await cargoService.getCargo(requireDb(req), parseId(req.params.id));

    res.status(200).json({ data: cargo });
});

export const createCargo = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);

    throwIfInvalid(validateCargo(body, { partial: false, allowZero: false }));

    const created = await cargoService.createCargo(requireDb(req), {
        nome: String(body.nome),
        nivelAcesso: String(body.nivelAcesso)
    });

    notifyStaffCadastro(req, "cargo");
    res.status(201).json({ data: created });
});

export const updateCargo = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);

    throwIfInvalid(validateCargo(body, { partial: req.method === "PATCH", allowZero: false }));

    const updated = await cargoService.updateCargo(requireDb(req), parseId(req.params.id), {
        nome: body.nome as string | undefined,
        nivelAcesso: body.nivelAcesso === undefined ? undefined : String(body.nivelAcesso)
    });

    res.status(200).json({ data: updated });
});

export const deleteCargo = catchAsync(async (req: Request, res: Response) => {
    await cargoService.deleteCargo(requireDb(req), parseId(req.params.id));

    res.status(204).send();
});
