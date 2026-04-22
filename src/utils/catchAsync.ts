import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
) => Promise<unknown>;

/**
 * Envolve um handler assíncrono para que rejeições sejam delegadas ao
 * `globalErrorHandler` via `next(err)`, evitando try/catch nos controllers.
 */
export function catchAsync(fn: AsyncRequestHandler): RequestHandler {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
