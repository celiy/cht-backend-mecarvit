import type { ApiErrorFields } from "@shared/errors/ApiError";

/**
 * Operational application error. Includes `statusCode` and optional `fields`
 * for field-level validation errors, following the shared ApiErrorResponse
 * contract used by the front-end.
 */
export class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational = true;
    readonly fields?: ApiErrorFields;
    readonly empresas?: Array<{ id: number; nome: string }>;

    constructor(
        message: string,
        statusCode: number,
        fields?: ApiErrorFields,
        empresas?: Array<{ id: number; nome: string }>
    ) {
        super(message);

        this.statusCode = statusCode;
        this.fields = fields;
        this.empresas = empresas;

        Error.captureStackTrace?.(this, this.constructor);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
