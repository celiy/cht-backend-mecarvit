import type { NextFunction, Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";
import { verifyToken } from "../utils/jwt.js";
import { empresaExists, openCompany } from "../config/database.js";
import * as usuarioService from "../services/usuarioService.js";

export const protect = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError("Não autenticado", 401);
    }

    const token = authHeader.slice("Bearer ".length).trim();

    if (!token) {
        throw new AppError("Não autenticado", 401);
    }

    let payload;

    try {
        payload = verifyToken(token);
    } catch {
        throw new AppError("Token inválido ou expirado", 401);
    }

    if (!empresaExists(payload.empresaId)) {
        throw new AppError("Empresa não encontrada", 401);
    }

    const db = openCompany(payload.empresaId);
    const user = await usuarioService.findPublicByCpf(db, payload.sub);

    if (!user || !user.ativo) {
        throw new AppError("Usuário não encontrado", 401);
    }

    req.user = user;
    req.empresaId = payload.empresaId;
    req.db = db;
    next();
});
