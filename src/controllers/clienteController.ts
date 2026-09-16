import type { Request, Response } from "express";
import { validateCliente } from "@shared/validators/mecarvit";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiFeatures } from "../utils/ApiFeatures.js";
import { defaultAtivoQuery, requireDb, requireUser } from "../utils/http.js";
import { throwIfInvalid, bodyOf } from "../utils/validate.js";
import { clientes } from "../db/schema/index.js";
import * as clienteService from "../services/clienteService.js";
import { asEnderecoIds, asEnderecos, asVeiculos } from "../utils/nested.js";

export const listClientes = catchAsync(async (req: Request, res: Response) => {
    const db = requireDb(req);
    const features = new ApiFeatures(db, clientes, defaultAtivoQuery(req.query as Record<string, unknown>))
        .filter()
        .sort()
        .limitFields()
        .paginate();
    const rows = await features.exec();
    const total = await features.count();
    const data = [];

    for (const row of rows) {
        data.push(await clienteService.getClienteDetalhe(db, String(row.documento)));
    }

    res.status(200).json({
        data,
        page: features.pagination.page,
        limit: features.pagination.limit,
        total
    });
});

export const getCliente = catchAsync(async (req: Request, res: Response) => {
    const cliente = await clienteService.getClienteDetalhe(
        requireDb(req),
        String(req.params.documento)
    );

    res.status(200).json({ data: cliente });
});

export const createCliente = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);

    throwIfInvalid(validateCliente(body, { partial: false }));

    const created = await clienteService.createCliente(requireDb(req), {
        documento: String(body.documento),
        nome: String(body.nome),
        nomeSocial: body.nomeSocial as string | undefined,
        cel: (body.cel ?? body.telefone) as string | undefined,
        email: body.email as string | undefined,
        obs: body.obs as string | undefined,
        ativo: body.ativo as boolean | undefined,
        usuarioCpf: requireUser(req).cpf,
        enderecoIds: asEnderecoIds(body.enderecoIds),
        enderecos: asEnderecos(body.enderecos),
        veiculos: asVeiculos(body.veiculos)
    });

    res.status(201).json({ data: created });
});

export const updateCliente = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);

    throwIfInvalid(validateCliente(body, { partial: true }));

    const updated = await clienteService.updateCliente(
        requireDb(req),
        String(req.params.documento),
        {
            nome: body.nome as string | undefined,
            nomeSocial: body.nomeSocial as string | undefined,
            cel: (body.cel ?? body.telefone) as string | undefined,
            email: body.email as string | undefined,
            obs: body.obs as string | undefined,
            ativo: body.ativo as boolean | undefined,
            enderecoIds: asEnderecoIds(body.enderecoIds),
            enderecos: asEnderecos(body.enderecos),
            veiculos: asVeiculos(body.veiculos),
            replaceNested: req.method === "PUT"
        }
    );

    res.status(200).json({ data: updated });
});

export const deleteCliente = catchAsync(async (req: Request, res: Response) => {
    await clienteService.deleteCliente(requireDb(req), String(req.params.documento));

    res.status(204).send();
});
