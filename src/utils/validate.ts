import { AppError } from "../utils/AppError.js";
import type { ApiErrorFields } from "@shared/errors/ApiError";

export function throwIfInvalid(fields: ApiErrorFields | null): void {
    if (fields) {
        throw new AppError("Validação falhou", 400, fields);
    }
}

export function bodyOf(req: { body?: unknown }): Record<string, unknown> {
    return (req.body ?? {}) as Record<string, unknown>;
}
