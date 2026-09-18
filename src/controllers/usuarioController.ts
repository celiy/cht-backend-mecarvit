import type { Request, Response } from "express";
import { digitsOnly, validateChangeSenha, validateCreateUsuario, validateUpdateUsuario } from "@shared/validators/mecarvit";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";
import { ApiFeatures } from "../utils/ApiFeatures.js";
import { defaultAtivoQuery, requireDb, requireUser } from "../utils/http.js";
import { throwIfInvalid, bodyOf } from "../utils/validate.js";
import { usuarios } from "../db/schema/index.js";
import { ACCESS } from "../db/schema/tables.js";
import * as usuarioService from "../services/usuarioService.js";
import { hasAccess, isSuperadmin } from "../utils/access.js";
import { ne } from "drizzle-orm";

export const listUsuarios = catchAsync(async (req: Request, res: Response) => {
    const db = requireDb(req);
    const actor = requireUser(req);
    const actorCpf = digitsOnly(actor.cpf);
    const features = new ApiFeatures(db, usuarios, defaultAtivoQuery(req.query as Record<string, unknown>))
        .filter()
        .sort()
        .limitFields()
        .paginate();

    if (actorCpf) {
        features.whereExtra(ne(usuarios.cpf, actorCpf));
    }
    const rows = await features.exec();
    const total = await features.count();
    const data = [];

    for (const row of rows) {
        const publicUser = await usuarioService.findPublicByCpf(db, String(row.cpf));

        if (publicUser) {
            data.push(publicUser);
        }
    }

    res.status(200).json({
        data,
        page: features.pagination.page,
        limit: features.pagination.limit,
        total
    });
});

export const getUsuario = catchAsync(async (req: Request, res: Response) => {
    const db = requireDb(req);
    const actor = requireUser(req);
    const cpf = digitsOnly(String(req.params.cpf ?? ""));
    const canManage = hasAccess(actor.nivelAcesso, ACCESS.FUNCIONARIOS);

    if (!canManage && actor.cpf !== cpf) {
        throw new AppError("Permissão insuficiente", 403);
    }

    const user = await usuarioService.findPublicByCpf(db, cpf);

    if (!user) {
        throw new AppError("Usuário não encontrado", 404);
    }

    res.status(200).json({ data: user });
});

export const createUsuario = catchAsync(async (req: Request, res: Response) => {
    const db = requireDb(req);
    const actor = requireUser(req);
    const body = bodyOf(req);

    throwIfInvalid(validateCreateUsuario(body, { senhaRequired: true }));

    const created = await usuarioService.createUsuario(db, {
        cpf: String(body.cpf),
        nome: String(body.nome),
        email: String(body.email),
        senha: String(body.senha),
        cargoId: Number(body.cargoId),
        empresaId: actor.empresaId,
        fundador: false,
        senhaInicial: true,
        ativo: body.ativo === undefined ? true : Boolean(body.ativo)
    });

    res.status(201).json({ data: created });
});

export const updateUsuario = catchAsync(async (req: Request, res: Response) => {
    const db = requireDb(req);
    const actor = requireUser(req);
    const targetCpf = digitsOnly(String(req.params.cpf ?? ""));
    const body = bodyOf(req);
    const target = await usuarioService.findPublicByCpf(db, targetCpf);

    if (!target) {
        throw new AppError("Usuário não encontrado", 404);
    }

    const isSelf = digitsOnly(actor.cpf) === targetCpf;
    const canManage = hasAccess(actor.nivelAcesso, ACCESS.FUNCIONARIOS);

    if (!isSelf && !canManage) {
        throw new AppError("Permissão insuficiente", 403);
    }

    if (
        !isSelf &&
        (target.fundador || isSuperadmin(target.nivelAcesso))
    ) {
        throw new AppError("Não é permitido alterar este usuário", 403);
    }

    throwIfInvalid(validateUpdateUsuario(body));

    const updated = await usuarioService.updateUsuario(db, targetCpf, {
        nome: body.nome as string | undefined,
        email: body.email as string | undefined,
        senha: body.senha as string | undefined,
        cargoId: isSelf
            ? undefined
            : body.cargoId === undefined
              ? undefined
              : Number(body.cargoId),
        ativo: isSelf ? undefined : (body.ativo as boolean | undefined)
    });

    res.status(200).json({ data: updated });
});

export const changeSenha = catchAsync(async (req: Request, res: Response) => {
    const db = requireDb(req);
    const actor = requireUser(req);
    const cpf = digitsOnly(String(req.params.cpf ?? ""));
    const body = bodyOf(req);

    if (actor.cpf !== cpf && !hasAccess(actor.nivelAcesso, ACCESS.FUNCIONARIOS)) {
        throw new AppError("Permissão insuficiente", 403);
    }

    throwIfInvalid(validateChangeSenha(body));

    const updated = await usuarioService.changeSenha(
        db,
        cpf,
        String(body.senhaAtual),
        String(body.senhaNova)
    );

    res.status(200).json({ data: updated });
});
