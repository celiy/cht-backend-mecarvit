import type { Request } from "express";
import type { AppDatabase } from "../config/database.js";
import { AppError } from "./AppError.js";

export function requireDb(req: Request): AppDatabase {
    if (!req.db) {
        throw new AppError("Empresa não selecionada", 401);
    }

    return req.db;
}

export function requireUser(req: Request) {
    if (!req.user) {
        throw new AppError("Não autenticado", 401);
    }

    return req.user;
}

export function parseId(value: string | undefined, label = "id"): number {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(`${label} inválido`, 400, { [label]: `${label} deve ser um inteiro positivo` });
    }

    return id;
}

export function defaultAtivoQuery(query: Record<string, unknown>): Record<string, unknown> {
    if (query.ativo === undefined) {
        return { ...query, ativo: "true" };
    }

    return query;
}
