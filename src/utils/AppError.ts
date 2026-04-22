import type { ApiErrorFields } from '@shared/errors/ApiError';

/**
 * Erro operacional da aplicação. Inclui `statusCode` e opcionalmente `fields`
 * para erros de validação por campo, seguindo o contrato ApiErrorResponse
 * compartilhado com o front-end.
 */
export class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational = true;
    readonly fields?: ApiErrorFields;

    constructor(message: string, statusCode: number, fields?: ApiErrorFields) {
        super(message);

        this.statusCode = statusCode;
        this.fields = fields;

        Error.captureStackTrace?.(this, this.constructor);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
