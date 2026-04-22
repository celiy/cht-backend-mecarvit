import type { RequestHandler } from 'express';
import xss from 'xss';
import { AppError } from '../utils/AppError.js';

function sanitizeObject(source: Record<string, unknown> | undefined): void {
    if (!source) return;

    for (const key of Object.keys(source)) {
        const value = source[key];
        if (typeof value === 'string') {
            source[key] = xss(value);
        }
    }
}

/** Sanitiza body/query/params removendo payloads XSS de strings. */
export const sanitize: RequestHandler = (req, _res, next) => {
    try {
        sanitizeObject(req.body as Record<string, unknown> | undefined);
        sanitizeObject(req.query as Record<string, unknown>);
        sanitizeObject(req.params as Record<string, unknown>);
        next();
    } catch (err) {
        console.error('Falha ao sanitizar requisição:', err);
        next(new AppError('Dados da requisição contêm conteúdo inválido', 400));
    }
};
