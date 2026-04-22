import type { RequestHandler } from 'express';

declare module 'express-serve-static-core' {
    interface Request {
        requestedAt?: string;
    }
}

/** Anexa o timestamp ISO da requisição em `req.requestedAt`. */
export const requestContext: RequestHandler = (req, _res, next) => {
    req.requestedAt = new Date().toISOString();
    next();
};
