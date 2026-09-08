import type { NextFunction, Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";
import { verifyToken } from "../utils/jwt.js";
import * as userService from "../services/userService.js";

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

    const user = await userService.findUserById(payload.sub);

    if (!user) {
        throw new AppError("Usuário não encontrado", 401);
    }

    req.user = user;
    next();
});
