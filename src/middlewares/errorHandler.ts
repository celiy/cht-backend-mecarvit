import type { ErrorRequestHandler } from 'express';
import type { ApiErrorFields, ApiErrorResponse } from '@shared/errors/ApiError';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

interface SqliteError extends Error {
    code?: string;
}

function isSqliteError(err: unknown): err is SqliteError {
    return err instanceof Error && typeof (err as SqliteError).code === 'string';
}

/**
 * Mapeia erros comuns do SQLite/better-sqlite3 para o formato com `fields`.
 * Ex.: UNIQUE em `users.email` → { email: "Email já cadastrado" }
 */
function mapSqliteError(err: SqliteError): AppError | null {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === 'SQLITE_CONSTRAINT') {
        const match = err.message.match(/UNIQUE constraint failed:\s*([^.]+)\.([^\s]+)/i);
        const fields: ApiErrorFields = {};

        if (match) {
            const column = match[2].replace(/`/g, '').trim();
            fields[column] = `${column} já cadastrado`;
        }

        return new AppError(
            'Registro duplicado',
            409,
            Object.keys(fields).length > 0 ? fields : undefined,
        );
    }

    if (err.code === 'SQLITE_CONSTRAINT_NOTNULL') {
        const match = err.message.match(/NOT NULL constraint failed:\s*([^.]+)\.([^\s]+)/i);
        const fields: ApiErrorFields = {};

        if (match) {
            const column = match[2].replace(/`/g, '').trim();
            fields[column] = `${column} é obrigatório`;
        }

        return new AppError(
            'Campo obrigatório ausente',
            400,
            Object.keys(fields).length > 0 ? fields : undefined,
        );
    }

    return null;
}

function normalizeError(err: unknown): AppError {
    if (err instanceof AppError) {
        return err;
    }

    if (isSqliteError(err)) {
        const mapped = mapSqliteError(err);
        if (mapped) return mapped;
    }

    if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
        return new AppError('JSON inválido no corpo da requisição', 400);
    }

    const message = err instanceof Error ? err.message : 'Erro interno do servidor';
    return new AppError(message, 500);
}

export const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const appError = normalizeError(err);
    const isServerError = appError.statusCode >= 500;

    if (isServerError || !env.isProduction) {
        console.error('[errorHandler]', {
            status: appError.statusCode,
            message: appError.message,
            fields: appError.fields,
            original: err instanceof Error ? err.stack : err,
        });
    }

    const payload: ApiErrorResponse = {
        status: appError.statusCode,
        error: {
            message: isServerError && env.isProduction
                ? 'Erro interno do servidor'
                : appError.message,
            ...(appError.fields ? { fields: appError.fields } : {}),
        },
    };

    res.status(appError.statusCode).json(payload);
};
