import type { NextFunction, Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";
import { verifyToken } from "../utils/jwt.js";
import { clearAuthCookie, readAuthToken } from "../utils/authCookie.js";
import { empresaExists, openCompany } from "../config/database.js";
import * as usuarioService from "../services/usuarioService.js";

export const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = readAuthToken(req);

    if (!token) {
        throw new AppError("Não autenticado", 401);
    }

    let payload;

    try {
        payload = verifyToken(token);
    } catch {
        clearAuthCookie(res);
        throw new AppError("Token inválido ou expirado", 401);
    }

    if (!empresaExists(payload.empresaId)) {
        clearAuthCookie(res);
        throw new AppError("Empresa não encontrada", 401);
    }

    const db = openCompany(payload.empresaId);
    const user = await usuarioService.findPublicByCpf(db, payload.sub);

    if (!user || !user.ativo) {
        clearAuthCookie(res);
        throw new AppError("Usuário não encontrado", 401);
    }

    req.user = user;
    req.empresaId = payload.empresaId;
    req.db = db;
    next();
});
