import type { RequestHandler } from "express";
import xss from "xss";
import { AppError } from "../utils/AppError.js";

function sanitizeValue(value: unknown): unknown {
    if (typeof value === "string") {
        return xss(value);
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item));
    }

    if (value !== null && typeof value === "object") {
        const result: Record<string, unknown> = {};

        for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
            result[key] = sanitizeValue(nested);
        }

        return result;
    }

    return value;
}

export const sanitize: RequestHandler = (req, _res, next) => {
    try {
        if (req.body && typeof req.body === "object") {
            req.body = sanitizeValue(req.body);
        }

        if (req.query && typeof req.query === "object") {
            req.query = sanitizeValue(req.query) as typeof req.query;
        }

        if (req.params && typeof req.params === "object") {
            req.params = sanitizeValue(req.params) as typeof req.params;
        }

        next();
    } catch (err) {
        console.error("Falha ao sanitizar requisição:", err);
        next(new AppError("Dados da requisição contêm conteúdo inválido", 400));
    }
};
