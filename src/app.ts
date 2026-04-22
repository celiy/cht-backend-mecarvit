import express, { type Express } from 'express';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requestContext } from './middlewares/requestContext.js';
import { sanitize } from './middlewares/sanitize.js';
import { notFound } from './middlewares/notFound.js';
import { globalErrorHandler } from './middlewares/errorHandler.js';
import { apiRouter } from './routes/index.js';

export function createApp(): Express {
    const app = express();

    app.set('trust proxy', 1);

    app.use(helmet());
    app.use(cookieParser());
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true, limit: '10kb' }));
    app.use(hpp());

    const corsOptions: CorsOptions = {
        origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
        credentials: true,
    };
    app.use(cors(corsOptions));

    app.use(requestContext);
    app.use(sanitize);

    app.use(express.static('public'));
    app.use('/data', express.static('data'));

    app.get('/ip', (req, res) => { res.send(req.ip); });
    app.get('/health', (_req, res) => { res.json({ status: 'ok', at: new Date().toISOString() }); });

    app.use('/api', apiRouter);

    app.all(/.*/, notFound);

    app.use(globalErrorHandler);

    return app;
}
