import type { Request, Response } from "express";
import { digitsOnly, validateChangeSenha, validateCreateUsuario, validateUpdateUsuario } from "@shared/validators/mecarvit";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";
import { ApiFeatures } from "../utils/ApiFeatures.js";
import { defaultAtivoQuery, requireDb, requireUser } from "../utils/http.js";
import { throwIfInvalid, bodyOf } from "../utils/validate.js";
import { usuarios } from "../db/schema/index.js";
import { ACCESS } from "@shared/mecarvit/access";
import * as usuarioService from "../services/usuarioService.js";
import { hasAccess, isGerente, isSuperadmin } from "../utils/access.js";
import { notifyStaffCadastro } from "../realtime/mecarvitRealtime.js";
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

    notifyStaffCadastro(req, "usuario");
    res.status(201).json({ data: created });
});

/**
 * Fields nobody may change on their own account.
 *
 * Editing your own cargo would let any employee grant themselves a broader one,
 * and `ativo` / `senhaInicial` bypass the manager controls. The request is
 * rejected instead of silently ignored so the caller learns nothing changed.
 */
function assertSelfEditableFields(isSelf: boolean, body: Record<string, unknown>): void {
    if (!isSelf) {
        return;
    }

    const blocked = ["cargoId", "ativo", "senhaInicial"].filter(
        (field) => body[field] !== undefined
    );

    if (blocked.length === 0) {
        return;
    }

    throw new AppError(
        "Alteração não permitida no próprio usuário",
        409,
        Object.fromEntries(
            blocked.map((field) => [field, "Você não pode alterar este campo na própria conta"])
        )
    );
}

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
    assertSelfEditableFields(isSelf, body);

    if (isSelf && !isGerente(actor.nivelAcesso) && !isSuperadmin(actor.nivelAcesso)) {
        const blockedProfile = ["nome", "email", "senha"].filter(
            (field) => body[field] !== undefined
        );

        if (blockedProfile.length > 0) {
            throw new AppError("Permissão insuficiente", 403);
        }
    }

    if ((body.senha !== undefined || body.senhaInicial !== undefined) && !isSelf && !isSuperadmin(actor.nivelAcesso)) {
        throw new AppError("Apenas o superadmin pode resetar a senha de funcionários", 403);
    }

    const updated = await usuarioService.updateUsuario(db, targetCpf, {
        nome: body.nome as string | undefined,
        email: body.email as string | undefined,
        senha: body.senha as string | undefined,
        cargoId: body.cargoId === undefined ? undefined : Number(body.cargoId),
        ativo: body.ativo as boolean | undefined,
        senhaInicial: body.senhaInicial as boolean | undefined
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

    if (
        actor.cpf === cpf
        && !actor.senhaInicial
        && !isGerente(actor.nivelAcesso)
        && !isSuperadmin(actor.nivelAcesso)
    ) {
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
