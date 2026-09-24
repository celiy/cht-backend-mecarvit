import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";
import { verifySystemToken } from "../utils/jwt.js";
import { isSystemOwnerConfigured, SYSTEM_TOKEN_HEADER } from "../config/systemOwnerEnv.js";

const PUBLIC_SYSTEM_ROUTES = new Set([
    "GET /system/status",
    "POST /system/setup",
    "POST /system/login"
]);

function requestRouteKey(req: Request): string {
    return `${req.method.toUpperCase()} ${req.path}`;
}

export const requireSystemOwner = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    if (!isSystemOwnerConfigured() || PUBLIC_SYSTEM_ROUTES.has(requestRouteKey(req))) {
        next();
        return;
    }

    const header = req.header(SYSTEM_TOKEN_HEADER) ?? "";
    const token = header.trim();

    if (!token) {
        throw new AppError("Desbloqueie o sistema para acessar os bancos locais", 403);
    }

    try {
        verifySystemToken(token);
    } catch {
        throw new AppError("Desbloqueie o sistema para acessar os bancos locais", 403);
    }

    next();
});
