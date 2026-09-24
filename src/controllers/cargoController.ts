import type { Request, Response } from "express";
import { validateCargo } from "@shared/validators/mecarvit";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiFeatures } from "../utils/ApiFeatures.js";
import { parseId, requireDb, requireUser } from "../utils/http.js";
import { throwIfInvalid, bodyOf } from "../utils/validate.js";
import { cargos } from "../db/schema/index.js";
import * as cargoService from "../services/cargoService.js";
import { notifyStaffCadastro } from "../realtime/mecarvitRealtime.js";
import { recordAudit } from "../utils/audit.js";

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
        nivelAcesso: body.nivelAcesso as string
    }, requireUser(req).nivelAcesso);

    notifyStaffCadastro(req, "cargo");
    recordAudit(req, {
        action: "create",
        entity: "cargo",
        entityId: String(created.id),
        after: created
    });
    res.status(201).json({ data: created });
});

export const updateCargo = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);
    const db = requireDb(req);
    const id = parseId(req.params.id);

    throwIfInvalid(validateCargo(body, { partial: req.method === "PATCH", allowZero: false }));

    const before = await cargoService.getCargo(db, id);
    const updated = await cargoService.updateCargo(
        db,
        id,
        {
            nome: body.nome as string | undefined,
            nivelAcesso: body.nivelAcesso === undefined ? undefined : (body.nivelAcesso as string)
        },
        requireUser(req).nivelAcesso
    );

    recordAudit(req, {
        action: "update",
        entity: "cargo",
        entityId: String(id),
        before,
        after: updated
    });
    res.status(200).json({ data: updated });
});

export const deleteCargo = catchAsync(async (req: Request, res: Response) => {
    const db = requireDb(req);
    const id = parseId(req.params.id);
    const before = await cargoService.getCargo(db, id);

    await cargoService.deleteCargo(db, id, requireUser(req).nivelAcesso);

    recordAudit(req, {
        action: "delete",
        entity: "cargo",
        entityId: String(id),
        before
    });
    res.status(204).send();
});
