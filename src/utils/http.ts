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

const ATIVO_TRUE = new Set(["true", "1", "ativo"]);
const ATIVO_FALSE = new Set(["false", "0", "inativo"]);

function ativoTokens(value: unknown): string[] {
    const raw = Array.isArray(value) ? value.map((item) => String(item)).join(",") : String(value ?? "");

    return raw
        .split(",")
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean);
}

/**
 * Inactive rows stay hidden unless the query explicitly asks for them
 * (`ativo=false`, `ativo=inativo`, or both active and inactive).
 */
export function defaultAtivoQuery(query: Record<string, unknown>): Record<string, unknown> {
    if (query.ativo === undefined) {
        return { ...query, ativo: "true" };
    }

    const tokens = ativoTokens(query.ativo);
    const hasTrue = tokens.some((token) => ATIVO_TRUE.has(token));
    const hasFalse = tokens.some((token) => ATIVO_FALSE.has(token));

    if (hasTrue && hasFalse) {
        const next = { ...query };
        delete next.ativo;

        return next;
    }

    if (hasFalse) {
        return { ...query, ativo: "false" };
    }

    if (hasTrue) {
        return { ...query, ativo: "true" };
    }

    return query;
}
