import type { RequestHandler } from "express";
import { AppError } from "../utils/AppError.js";
import { isGerente } from "../utils/access.js";

/** Dashboard data is gerente / superadmin only. */
export const requireGerente: RequestHandler = (req, _res, next) => {
    const nivel = req.user?.nivelAcesso ?? "";

    if (!isGerente(nivel)) {
        next(new AppError("Permissão insuficiente", 403));
        return;
    }

    next();
};
