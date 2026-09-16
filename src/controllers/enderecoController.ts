import type { Request, Response } from "express";
import { validateEndereco } from "@shared/validators/mecarvit";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiFeatures } from "../utils/ApiFeatures.js";
import { parseId, requireDb } from "../utils/http.js";
import { throwIfInvalid, bodyOf } from "../utils/validate.js";
import { enderecos } from "../db/schema/index.js";
import * as enderecoService from "../services/enderecoService.js";

export const listEnderecos = catchAsync(async (req: Request, res: Response) => {
    const db = requireDb(req);
    const features = new ApiFeatures(db, enderecos, req.query as Record<string, unknown>)
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

export const getEndereco = catchAsync(async (req: Request, res: Response) => {
    const endereco = await enderecoService.getEndereco(requireDb(req), parseId(req.params.id));

    res.status(200).json({ data: endereco });
});

export const createEndereco = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);

    const enderecoErrors = validateEndereco(body, "");

    if (Object.keys(enderecoErrors).length > 0) {
        throwIfInvalid(enderecoErrors);
    }

    const created = await enderecoService.createEndereco(requireDb(req), {
        estado: String(body.estado),
        cidade: String(body.cidade),
        cep: String(body.cep),
        bairro: String(body.bairro),
        rua: String(body.rua),
        numero: Number(body.numero),
        complemento: String(body.complemento ?? "")
    });

    res.status(201).json({ data: created });
});

export const updateEndereco = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);

    const enderecoErrors = validateEndereco(body, "");

    if (Object.keys(enderecoErrors).length > 0) {
        throwIfInvalid(enderecoErrors);
    }

    const updated = await enderecoService.updateEndereco(requireDb(req), parseId(req.params.id), {
        estado: String(body.estado),
        cidade: String(body.cidade),
        cep: String(body.cep),
        bairro: String(body.bairro),
        rua: String(body.rua),
        numero: Number(body.numero),
        complemento: String(body.complemento ?? "")
    });

    res.status(200).json({ data: updated });
});
