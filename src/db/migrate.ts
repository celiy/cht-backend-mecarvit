import { closeDatabase, runMigrations } from '../config/database.js';

console.log('Aplicando migrações...');

try {
    runMigrations();
    console.log('Migrações aplicadas com sucesso.');
} catch (err) {
    console.error('Falha ao aplicar migrações:', err);
    process.exitCode = 1;
} finally {
    closeDatabase();
}
