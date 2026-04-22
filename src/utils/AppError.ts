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

    constructor(message: string, statusCode: number, fields?: ApiErrorFields) {
        super(message);

        this.statusCode = statusCode;
        this.fields = fields;

        Error.captureStackTrace?.(this, this.constructor);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
