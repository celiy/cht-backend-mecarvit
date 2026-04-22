import type { RequestHandler } from 'express';
import { AppError } from '../utils/AppError.js';

export const notFound: RequestHandler = (req, _res, next) => {
    next(new AppError(`Rota não encontrada: ${req.method} ${req.originalUrl}`, 404));
};
