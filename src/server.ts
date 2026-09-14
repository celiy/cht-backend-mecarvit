import type { Server } from "node:http";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { closeAllCompanies, runMigrations } from "./config/database.js";
import { startRepl } from "./repl/index.js";
import { freeListenPort } from "./utils/freeListenPort.js";

process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
    process.exit(1);
});

console.log(`Current environment: ${env.nodeEnv}`);

runMigrations();

const app = createApp();

await freeListenPort(env.port, env.host);

const server: Server = app.listen(env.port, env.host, () => {
    console.log(`Servidor iniciado em http://${env.host}:${env.port}`);
    startRepl(app);
});

function shutdown(signal: string, code: number): void {
    console.log(`Received ${signal}, shutting down...`);
    server.close(() => {
        closeAllCompanies();
        process.exit(code);
    });
}

process.on("unhandledRejection", (reason) => {
    console.error("UNHANDLED REJECTION:", reason);
    shutdown("unhandledRejection", 1);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
        shutdown(signal, 0);
    });
}
