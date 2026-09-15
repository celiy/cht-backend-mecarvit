import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import {
    closeDatabase,
    listLocalEmpresaIds,
    openCompany,
    type AppDatabase
} from "../../config/database.js";
import { env } from "../../config/env.js";
import {
    cargos,
    clientes,
    enderecos,
    enderecosCliente,
    itensServico,
    ordensServico,
    pagamentos,
    registrosEntradaSaida,
    responsaveis,
    servicos,
    usuarios,
    veiculos
} from "../schema/index.js";

const MOCK = true;

export async function clearMockInDatabase(db: AppDatabase): Promise<void> {
    await db.delete(pagamentos).where(eq(pagamentos.mock, MOCK));
    await db.delete(itensServico).where(eq(itensServico.mock, MOCK));
    await db.delete(responsaveis).where(eq(responsaveis.mock, MOCK));
    await db.delete(ordensServico).where(eq(ordensServico.mock, MOCK));
    await db.delete(registrosEntradaSaida).where(eq(registrosEntradaSaida.mock, MOCK));
    await db.delete(veiculos).where(eq(veiculos.mock, MOCK));
    await db.delete(enderecosCliente).where(eq(enderecosCliente.mock, MOCK));
    await db.delete(clientes).where(eq(clientes.mock, MOCK));
    await db.delete(enderecos).where(eq(enderecos.mock, MOCK));
    await db.delete(usuarios).where(eq(usuarios.mock, MOCK));
    await db.delete(cargos).where(eq(cargos.mock, MOCK));
    await db.delete(servicos).where(eq(servicos.mock, MOCK));
}

export async function clearAllMockData(): Promise<number> {
    const ids = listLocalEmpresaIds();

    for (const empresaId of ids) {
        const db = openCompany(empresaId);
        await clearMockInDatabase(db);
    }

    return ids.length;
}

async function runCli() {
    if (env.isProduction && process.env.FORCE_MOCK !== "1") {
        console.error("Recusa: NODE_ENV=production. Use FORCE_MOCK=1 se realmente quiser apagar dados mock.");
        process.exit(1);
    }

    console.log("Removendo registros com mock = true...");

    const companies = await clearAllMockData();

    closeDatabase();

    if (companies === 0) {
        console.log("Nenhuma empresa encontrada.");
        return;
    }

    console.log(`Dados mock removidos em ${companies} empresa(s).`);
    console.log("A empresa mock (se existir) permanece; rode `npm run db:mock` para popular de novo.");
}

const isCli = process.argv[1] !== undefined
    && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
    runCli().catch((error) => {
        console.error(error);
        closeDatabase();
        process.exit(1);
    });
}
