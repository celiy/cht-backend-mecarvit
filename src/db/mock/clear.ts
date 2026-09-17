import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq, inArray, or } from "drizzle-orm";
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

function orIfMany(conditions: ReturnType<typeof eq>[]): ReturnType<typeof eq> | ReturnType<typeof or> {
    if (conditions.length === 0) {
        throw new Error("orIfMany requires at least one condition");
    }

    if (conditions.length === 1) {
        return conditions[0];
    }

    return or(...conditions);
}

export async function clearMockInDatabase(db: AppDatabase): Promise<void> {
    const mockVeiculoIds = (
        await db.select({ id: veiculos.id }).from(veiculos).where(eq(veiculos.mock, MOCK))
    ).map((row) => row.id);

    const mockUsuarioCpfs = (
        await db.select({ cpf: usuarios.cpf }).from(usuarios).where(eq(usuarios.mock, MOCK))
    ).map((row) => row.cpf);

    const mockClienteDocumentos = new Set(
        (
            await db.select({ documento: clientes.documento }).from(clientes).where(eq(clientes.mock, MOCK))
        ).map((row) => row.documento)
    );

    if (mockUsuarioCpfs.length > 0) {
        const fromMockUsuario = await db
            .select({ documento: clientes.documento })
            .from(clientes)
            .where(inArray(clientes.usuarioCpf, mockUsuarioCpfs));

        for (const row of fromMockUsuario) {
            mockClienteDocumentos.add(row.documento);
        }
    }

    const clienteDocumentosToClear = [...mockClienteDocumentos];

    const mockRegistroIds = (
        await db
            .select({ id: registrosEntradaSaida.id })
            .from(registrosEntradaSaida)
            .where(eq(registrosEntradaSaida.mock, MOCK))
    ).map((row) => row.id);

    const mockCargoIds = (
        await db.select({ id: cargos.id }).from(cargos).where(eq(cargos.mock, MOCK))
    ).map((row) => row.id);

    const mockServicoIds = (
        await db.select({ id: servicos.id }).from(servicos).where(eq(servicos.mock, MOCK))
    ).map((row) => row.id);

    const pagamentoFilters = [eq(pagamentos.mock, MOCK)];

    if (mockRegistroIds.length > 0) {
        pagamentoFilters.push(inArray(pagamentos.regEntradaSaidaId, mockRegistroIds));
    }

    await db.delete(pagamentos).where(orIfMany(pagamentoFilters));

    const ordemServicoFilters = [eq(ordensServico.mock, MOCK)];

    if (mockVeiculoIds.length > 0) {
        ordemServicoFilters.push(inArray(ordensServico.veiculoId, mockVeiculoIds));
    }

    if (clienteDocumentosToClear.length > 0) {
        ordemServicoFilters.push(inArray(ordensServico.clienteDocumento, clienteDocumentosToClear));
    }

    if (mockRegistroIds.length > 0) {
        ordemServicoFilters.push(inArray(ordensServico.regEntradaSaidaId, mockRegistroIds));
    }

    await db.delete(ordensServico).where(orIfMany(ordemServicoFilters));

    const itemServicoFilters = [eq(itensServico.mock, MOCK)];

    if (mockServicoIds.length > 0) {
        itemServicoFilters.push(inArray(itensServico.servicoId, mockServicoIds));
    }

    await db.delete(itensServico).where(orIfMany(itemServicoFilters));

    const responsavelFilters = [eq(responsaveis.mock, MOCK)];

    if (mockUsuarioCpfs.length > 0) {
        responsavelFilters.push(inArray(responsaveis.usuarioCpf, mockUsuarioCpfs));
    }

    await db.delete(responsaveis).where(orIfMany(responsavelFilters));

    const registroFilters = [eq(registrosEntradaSaida.mock, MOCK)];

    if (mockUsuarioCpfs.length > 0) {
        registroFilters.push(inArray(registrosEntradaSaida.usuarioCpf, mockUsuarioCpfs));
    }

    await db.delete(registrosEntradaSaida).where(orIfMany(registroFilters));

    const veiculoFilters = [eq(veiculos.mock, MOCK)];

    if (clienteDocumentosToClear.length > 0) {
        veiculoFilters.push(inArray(veiculos.clienteDocumento, clienteDocumentosToClear));
    }

    await db.delete(veiculos).where(orIfMany(veiculoFilters));

    const enderecoClienteFilters = [eq(enderecosCliente.mock, MOCK)];

    if (clienteDocumentosToClear.length > 0) {
        enderecoClienteFilters.push(inArray(enderecosCliente.clienteDocumento, clienteDocumentosToClear));
    }

    await db.delete(enderecosCliente).where(orIfMany(enderecoClienteFilters));

    if (clienteDocumentosToClear.length > 0) {
        await db.delete(clientes).where(inArray(clientes.documento, clienteDocumentosToClear));
    } else {
        await db.delete(clientes).where(eq(clientes.mock, MOCK));
    }
    await db.delete(enderecos).where(eq(enderecos.mock, MOCK));

    const usuarioFilters = [eq(usuarios.mock, MOCK)];

    if (mockCargoIds.length > 0) {
        usuarioFilters.push(inArray(usuarios.cargoId, mockCargoIds));
    }

    await db.delete(usuarios).where(orIfMany(usuarioFilters));
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
