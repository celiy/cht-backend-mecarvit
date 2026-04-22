import type { Server } from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { closeDatabase, initDatabase, runMigrations } from './config/database.js';
import './utils/schedules.js';

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});

console.log(`Ambiente atual: ${env.nodeEnv}`);
console.log('Conectando ao banco de dados SQLite...');

initDatabase();
runMigrations();

console.log('Banco de dados pronto.');

const app = createApp();

const server: Server = app.listen(env.port, env.host, () => {
    console.log(`Servidor iniciado em http://${env.host}:${env.port}`);
});

process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
    server.close(() => {
        closeDatabase();
        process.exit(1);
    });
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
        console.log(`Recebido ${signal}, encerrando...`);
        server.close(() => {
            closeDatabase();
            process.exit(0);
        });
    });
}
