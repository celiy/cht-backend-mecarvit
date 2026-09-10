import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import { cargos, empresas, statusOs, STATUS_OS_NOMES } from "../db/schema/index.js";
import { env } from "./env.js";

export type AppDatabase = BetterSQLite3Database<typeof schema>;

type PoolEntry = {
    sqlite: Database.Database;
    db: AppDatabase;
};

const pool = new Map<number, PoolEntry>();

function migrationsFolder(): string {
    return path.resolve(process.cwd(), "src/db/migrations");
}

export function empresasDir(): string {
    return path.resolve(process.cwd(), env.empresasDir);
}

export function empresaFilePath(empresaId: number): string {
    return path.join(empresasDir(), `${empresaId}.sqlite`);
}

function ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function openSqlite(filePath: string): Database.Database {
    ensureDir(path.dirname(filePath));

    const sqlite = new Database(filePath);

    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    return sqlite;
}

function applyMigrations(db: AppDatabase): void {
    const folder = migrationsFolder();

    if (!fs.existsSync(folder)) {
        return;
    }

    migrate(db, { migrationsFolder: folder });
}

export async function seedCompany(db: AppDatabase, empresaId: number, nome: string): Promise<void> {
    const existingEmpresa = await db.select().from(empresas).limit(1);

    if (!existingEmpresa[0]) {
        await db.insert(empresas).values({ id: empresaId, nome: nome.trim() });
    }

    const existingCargo = await db.select().from(cargos).where(eq(cargos.nivelAcesso, "0")).limit(1);

    if (!existingCargo[0]) {
        await db.insert(cargos).values({
            id: 1,
            nome: "Superadmin",
            nivelAcesso: "0"
        });
    }

    const existingStatus = await db.select().from(statusOs);

    if (existingStatus.length === 0) {
        await db.insert(statusOs).values(
            STATUS_OS_NOMES.map((nomeStatus, index) => ({
                id: index + 1,
                nome: nomeStatus
            }))
        );
    }
}

export function openCompany(empresaId: number): AppDatabase {
    const cached = pool.get(empresaId);

    if (cached) {
        return cached.db;
    }

    const filePath = empresaFilePath(empresaId);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Empresa ${empresaId} não encontrada`);
    }

    const sqlite = openSqlite(filePath);
    const db = drizzle(sqlite, { schema });

    applyMigrations(db);
    pool.set(empresaId, { sqlite, db });

    return db;
}

export function listLocalEmpresaIds(): number[] {
    const dir = empresasDir();

    if (!fs.existsSync(dir)) {
        return [];
    }

    return fs
        .readdirSync(dir)
        .map((file) => {
            const match = file.match(/^(\d+)\.sqlite$/);

            return match ? Number(match[1]) : NaN;
        })
        .filter((id) => Number.isInteger(id) && id > 0)
        .sort((a, b) => a - b);
}

export function nextEmpresaId(): number {
    const ids = listLocalEmpresaIds();

    return (ids[ids.length - 1] ?? 0) + 1;
}

export async function createCompanyDatabase(nome: string): Promise<{ empresaId: number; db: AppDatabase }> {
    ensureDir(empresasDir());

    const empresaId = nextEmpresaId();
    const filePath = empresaFilePath(empresaId);
    const sqlite = openSqlite(filePath);
    const db = drizzle(sqlite, { schema });

    applyMigrations(db);
    await seedCompany(db, empresaId, nome);
    pool.set(empresaId, { sqlite, db });

    return { empresaId, db };
}

export async function listLocalEmpresas(): Promise<Array<{ id: number; nome: string }>> {
    const result: Array<{ id: number; nome: string }> = [];

    for (const id of listLocalEmpresaIds()) {
        try {
            const db = openCompany(id);
            const rows = await db.select().from(empresas).limit(1);

            result.push({
                id,
                nome: rows[0]?.nome ?? `Empresa ${id}`
            });
        } catch {
            result.push({ id, nome: `Empresa ${id}` });
        }
    }

    return result;
}

export function closeCompany(empresaId: number): void {
    const entry = pool.get(empresaId);

    if (!entry) {
        return;
    }

    entry.sqlite.close();
    pool.delete(empresaId);
}

export function closeAllCompanies(): void {
    for (const empresaId of [...pool.keys()]) {
        closeCompany(empresaId);
    }
}

export function empresaExists(empresaId: number): boolean {
    return fs.existsSync(empresaFilePath(empresaId));
}

export function runMigrations(): void {
    for (const id of listLocalEmpresaIds()) {
        openCompany(id);
    }
}

export function closeDatabase(): void {
    closeAllCompanies();
}

export function removeCompanyFiles(empresaId: number): void {
    closeCompany(empresaId);

    const filePath = empresaFilePath(empresaId);

    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
        const target = `${filePath}${suffix}`;

        if (fs.existsSync(target)) {
            fs.rmSync(target, { force: true });
        }
    }
}

const SQLITE_FILE_PATTERN = /\.sqlite(?:-wal|-shm|-journal)?$/;

function removeIfExists(filePath: string, removed: string[]): void {
    if (!fs.existsSync(filePath)) {
        return;
    }

    fs.rmSync(filePath, { force: true });
    removed.push(filePath);
}

/**
 * Deletes every company SQLite file under EMPRESAS_DIR and the leftover singleton DB.
 * Close the running server afterwards so the in-memory pool does not keep stale handles.
 */
export function resetAllData(): string[] {
    closeAllCompanies();

    const removed: string[] = [];
    const dir = empresasDir();

    if (fs.existsSync(dir)) {
        for (const file of fs.readdirSync(dir)) {
            if (!SQLITE_FILE_PATTERN.test(file)) {
                continue;
            }

            removeIfExists(path.join(dir, file), removed);
        }
    }

    const legacy = path.resolve(process.cwd(), env.dbPath);

    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
        removeIfExists(`${legacy}${suffix}`, removed);
    }

    return removed;
}
