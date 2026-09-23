import http, { type Server } from "node:http";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { closeAllCompanies, runMigrations } from "./config/database.js";
import { startRepl } from "./repl/index.js";
import { listenOnAvailablePort } from "./utils/findListenPort.js";
import { attachMecarvitRealtime } from "./realtime/mecarvitRealtime.js";

process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
    process.exit(1);
});

console.log(`Current environment: ${env.nodeEnv}`);

runMigrations();

const app = createApp();
const httpServer: Server = http.createServer(app);
const realtime = attachMecarvitRealtime(httpServer);
const { port } = await listenOnAvailablePort(httpServer, env.port, env.host, env.portScanLimit);
const apiBaseUrl = `http://${env.host}:${port}`;

console.log(`Servidor iniciado em ${apiBaseUrl}`);
console.log(`CHT_API_URL=${apiBaseUrl}`);
startRepl(app);

function shutdown(signal: string, code: number): void {
    console.log(`Received ${signal}, shutting down...`);
    httpServer.close(() => {
        realtime.close();
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
