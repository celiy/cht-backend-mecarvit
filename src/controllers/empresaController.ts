import type { Request, Response } from "express";
import { validateEmpresa } from "@shared/validators/mecarvit";
import { catchAsync } from "../utils/catchAsync.js";
import { parseId, requireDb, requireUser } from "../utils/http.js";
import { throwIfInvalid, bodyOf } from "../utils/validate.js";
import { AppError } from "../utils/AppError.js";
import { isSuperadmin } from "../utils/access.js";
import * as empresaService from "../services/empresaService.js";

export const getEmpresaAtual = catchAsync(async (req: Request, res: Response) => {
    const empresa = await empresaService.getEmpresa(requireDb(req), requireUser(req).empresaId);

    res.status(200).json({ data: empresa });
});

export const getEmpresa = catchAsync(async (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    const actor = requireUser(req);

    if (id !== actor.empresaId) {
        throw new AppError("Empresa não encontrada", 404);
    }

    const empresa = await empresaService.getEmpresa(requireDb(req), id);

    res.status(200).json({ data: empresa });
});

export const updateEmpresa = catchAsync(async (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    const actor = requireUser(req);
    const body = bodyOf(req);

    if (id !== actor.empresaId) {
        throw new AppError("Empresa não encontrada", 404);
    }

    if (!isSuperadmin(actor.nivelAcesso)) {
        throw new AppError("Permissão insuficiente", 403);
    }

    throwIfInvalid(validateEmpresa(body, req.method === "PATCH"));

    const updated = await empresaService.updateEmpresa(requireDb(req), id, {
        nome: body.nome as string | undefined
    });

    res.status(200).json({ data: updated });
});
