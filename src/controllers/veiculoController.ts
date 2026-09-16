import type { Request, Response } from "express";
import { validateVeiculo } from "@shared/validators/mecarvit";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiFeatures } from "../utils/ApiFeatures.js";
import { parseId, requireDb } from "../utils/http.js";
import { throwIfInvalid, bodyOf } from "../utils/validate.js";
import { veiculos } from "../db/schema/index.js";
import * as veiculoService from "../services/veiculoService.js";

function parseKilometragemBody(value: unknown): number | null | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    return Number(value);
}

export const listVeiculos = catchAsync(async (req: Request, res: Response) => {
    const db = requireDb(req);
    const features = new ApiFeatures(db, veiculos, req.query as Record<string, unknown>)
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

export const getVeiculo = catchAsync(async (req: Request, res: Response) => {
    const veiculo = await veiculoService.getVeiculo(requireDb(req), parseId(req.params.id));

    res.status(200).json({ data: veiculo });
});

export const createVeiculo = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);

    throwIfInvalid(validateVeiculo(body, { partial: false, requireCliente: true }));

    const created = await veiculoService.createVeiculo(requireDb(req), {
        modelo: String(body.modelo),
        placa: String(body.placa),
        clienteDocumento: String(body.clienteDocumento),
        tipo: body.tipo as string | undefined,
        kilometragem: parseKilometragemBody(body.kilometragem),
        dataTrocaOleo: body.dataTrocaOleo as string | undefined,
        chassi: body.chassi as string | undefined
    });

    res.status(201).json({ data: created });
});

export const updateVeiculo = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);

    throwIfInvalid(validateVeiculo(body, { partial: req.method === "PATCH", requireCliente: false }));

    const updated = await veiculoService.updateVeiculo(requireDb(req), parseId(req.params.id), {
        modelo: body.modelo as string | undefined,
        placa: body.placa as string | undefined,
        tipo: body.tipo as string | undefined,
        kilometragem: parseKilometragemBody(body.kilometragem),
        dataTrocaOleo: body.dataTrocaOleo as string | undefined,
        chassi: body.chassi as string | undefined,
        ativo: body.ativo as boolean | undefined,
        clienteDocumento: body.clienteDocumento as string | undefined
    });

    res.status(200).json({ data: updated });
});

export const deleteVeiculo = catchAsync(async (req: Request, res: Response) => {
    await veiculoService.deleteVeiculo(requireDb(req), parseId(req.params.id));

    res.status(204).send();
});
