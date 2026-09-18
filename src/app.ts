import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { requestContext } from "./middlewares/requestContext.js";
import { sanitize } from "./middlewares/sanitize.js";
import { notFound } from "./middlewares/notFound.js";
import { globalErrorHandler } from "./middlewares/errorHandler.js";
import { apiRouter } from "./routes/index.js";

const LOOPBACK_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]"];

/**
 * `localhost` and `127.0.0.1` are distinct origins for the browser, so every
 * loopback entry also allows its aliases (desktop app loads `127.0.0.1`).
 */
function expandLoopbackOrigins(origins: string[]): string[] {
    const expanded = new Set<string>();

    for (const origin of origins) {
        expanded.add(origin);

        let url: URL;

        try {
            url = new URL(origin);
        } catch {
            continue;
        }

        if (!LOOPBACK_HOSTNAMES.includes(url.hostname)) {
            continue;
        }

        for (const hostname of LOOPBACK_HOSTNAMES) {
            expanded.add(`${url.protocol}//${hostname}${url.port ? `:${url.port}` : ""}`);
        }
    }

    return [...expanded];
}

export function createApp(): Express {
    const app = express();

    app.set("trust proxy", 1);

    app.use(helmet());
    app.use(cookieParser());
    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: true, limit: "1mb" }));
    app.use(hpp());

    const corsOrigins = expandLoopbackOrigins(env.corsOrigins);
    const corsOptions: CorsOptions = {
        origin: corsOrigins.length > 0 ? corsOrigins : true,
        credentials: true,
    };
    app.use(cors(corsOptions));

    app.use(requestContext);
    app.use(sanitize);

    app.use(express.static("public"));
    app.use("/data", express.static("data"));

    app.get("/ip", (req, res) => { res.send(req.ip); });
    app.get("/health", (_req, res) => { res.json({ status: "ok", at: new Date().toISOString() }); });

    app.use("/api", apiRouter);

    app.all(/.*/, notFound);

    app.use(globalErrorHandler);

    return app;
}
