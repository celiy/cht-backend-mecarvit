import type { RequestHandler } from "express";
import { AppError } from "../utils/AppError.js";
import { hasAccess } from "../utils/access.js";

export function requireAccess(digit: string): RequestHandler {
    return (req, _res, next) => {
        const nivel = req.user?.nivelAcesso ?? "";

        if (!hasAccess(nivel, digit)) {
            next(new AppError("Permissão insuficiente", 403));
            return;
        }

        next();
    };
}

export const requirePasswordChanged: RequestHandler = (req, _res, next) => {
    if (!req.user?.senhaInicial) {
        next();
        return;
    }

    const isOwnSenha =
        req.method === "POST" &&
        typeof req.originalUrl === "string" &&
        req.originalUrl.includes("/senha");

    if (isOwnSenha) {
        next();
        return;
    }

    if (req.method === "GET") {
        next();
        return;
    }

    next(new AppError("Defina uma senha própria antes de continuar", 403, {
        senha: "Troca de senha inicial obrigatória"
    }));
};
