import type { Request, Response } from "express";
import { validateCadastro } from "@shared/validators/mecarvit";
import { validateLogin } from "@shared/validators/auth";
import { catchAsync } from "../utils/catchAsync.js";
import { throwIfInvalid, bodyOf } from "../utils/validate.js";
import * as authService from "../services/authService.js";
import { requireUser } from "../utils/http.js";

export const cadastro = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);
    throwIfInvalid(validateCadastro(body));

    const empresa = body.empresa as { nome: string };
    const usuario = body.usuario as { cpf: string; nome: string; email: string; senha?: string; password?: string };
    const result = await authService.cadastrarEmpresa({
        empresa,
        usuario: {
            cpf: usuario.cpf,
            nome: usuario.nome,
            email: usuario.email,
            senha: String(usuario.senha ?? usuario.password)
        }
    });

    res.status(201).json({ data: result });
});

export const login = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);
    throwIfInvalid(validateLogin({
        email: body.email as string,
        senha: (body.senha ?? body.password) as string,
        empresaId: body.empresaId as number | undefined
    }));

    const empresaIdRaw = body.empresaId;
    const empresaId = empresaIdRaw === undefined || empresaIdRaw === null || empresaIdRaw === ""
        ? undefined
        : Number(empresaIdRaw);

    const result = await authService.login({
        email: String(body.email),
        senha: String(body.senha ?? body.password),
        empresaId
    });

    res.status(200).json({ data: result });
});

export const empresaLocais = catchAsync(async (_req: Request, res: Response) => {
    const empresas = await authService.listarEmpresasLocais();

    res.status(200).json({ data: empresas });
});

export const me = catchAsync(async (req: Request, res: Response) => {
    res.status(200).json({ data: requireUser(req) });
});
