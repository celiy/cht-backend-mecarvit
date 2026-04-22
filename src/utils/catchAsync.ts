import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
) => Promise<unknown>;

/**
 * Wraps an async request handler so rejections are forwarded
 * to `globalErrorHandler` through `next(err)`, avoiding repeated try/catch
 * blocks in controllers.
 */
export function catchAsync(fn: AsyncRequestHandler): RequestHandler {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
