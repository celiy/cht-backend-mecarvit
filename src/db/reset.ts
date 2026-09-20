import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";
import {
    closeDatabase,
    listLocalEmpresaIds,
    openCompany,
    removeCompanyFiles,
    resetAllData
} from "../config/database.js";
import { empresas, usuarios } from "./schema/index.js";
import { clearMockInDatabase } from "./mock/clear.js";

export async function resetMockData(): Promise<{
    removedCompanyIds: number[];
    clearedCompanyIds: number[];
}> {
    const removedCompanyIds: number[] = [];
    const clearedCompanyIds: number[] = [];

    for (const empresaId of listLocalEmpresaIds()) {
        const db = openCompany(empresaId);
        const empresa = (await db.select().from(empresas).limit(1))[0];
        const realUsers = await db
            .select({ cpf: usuarios.cpf })
            .from(usuarios)
            .where(eq(usuarios.mock, false));
        const mockOnlyCompany = empresa?.mock === true && realUsers.length === 0;

        if (mockOnlyCompany) {
            removeCompanyFiles(empresaId);
            removedCompanyIds.push(empresaId);
            continue;
        }

        await clearMockInDatabase(db);
        clearedCompanyIds.push(empresaId);
    }

    return { removedCompanyIds, clearedCompanyIds };
}

async function runCli(): Promise<void> {
    if (env.isProduction && process.env.FORCE_RESET !== "1") {
        console.error("Recusa: NODE_ENV=production. Use FORCE_RESET=1 se realmente quiser apagar os dados.");
        process.exit(1);
    }

    if (process.env.FORCE_RESET_ALL === "1") {
        console.log(`Apagando todos os SQLite em ${env.empresasDir}...`);

        const removed = resetAllData();

        if (removed.length === 0) {
            console.log("Nenhum arquivo de dados encontrado.");
        } else {
            for (const file of removed) {
                console.log(`Removido: ${file}`);
            }

            console.log(`${removed.length} arquivo(s) apagado(s).`);
        }

        return;
    }

    console.log("Removendo oficinas e registros mock; oficinas reais permanecem...");

    const result = await resetMockData();

    closeDatabase();

    if (result.removedCompanyIds.length === 0 && result.clearedCompanyIds.length === 0) {
        console.log("Nenhuma empresa encontrada.");
        return;
    }

    if (result.removedCompanyIds.length > 0) {
        console.log(`Oficina(s) mock removida(s): ${result.removedCompanyIds.join(", ")}`);
    }

    if (result.clearedCompanyIds.length > 0) {
        console.log(`Mock limpo em oficina(s) real(is): ${result.clearedCompanyIds.join(", ")}`);
    }
}

const isCli = process.argv[1] !== undefined
    && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
    runCli()
        .then(() => {
            console.log("Pronto. Se o servidor estiver rodando, reinicie (`npm run dev`).");
        })
        .catch((error) => {
            console.error(error);
            closeDatabase();
            process.exit(1);
        });
}
