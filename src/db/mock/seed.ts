import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import {
    closeDatabase,
    createCompanyDatabase,
    listLocalEmpresaIds,
    openCompany,
    type AppDatabase
} from "../../config/database.js";
import { env } from "../../config/env.js";
import {
    cargos,
    clientes,
    empresas,
    enderecos,
    enderecosCliente,
    itensServico,
    ordensServico,
    pagamentos,
    registrosEntradaSaida,
    responsaveis,
    servicos,
    STATUS_OS,
    usuarios,
    veiculos
} from "../schema/index.js";
import { clearMockInDatabase } from "./clear.js";
import { MOCK_COMPANY_NAME, MOCK_COUNTS, MOCK_LOGIN, MOCK_STAFF_PASSWORD } from "./constants.js";
import { ACCESS, hasAccess, migrateNivelAcesso } from "@shared/mecarvit/access";

const MOCK = true;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);
const SEED = 20260915;

const FIRST_NAMES = [
    "Ana", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gabriela", "Henrique",
    "Isabela", "João", "Karina", "Lucas", "Marina", "Nicolas", "Olívia", "Paulo",
    "Queila", "Rafael", "Sofia", "Tiago", "Úrsula", "Vitor", "Wagner", "Yasmin"
];

const LAST_NAMES = [
    "Almeida", "Barbosa", "Cardoso", "Dias", "Esteves", "Ferreira", "Gomes",
    "Henriques", "Ibrahim", "Junqueira", "Lima", "Mendes", "Nogueira", "Oliveira",
    "Pereira", "Queiroz", "Ribeiro", "Santos", "Teixeira", "Vieira"
];

const COMPANY_NAMES = [
    "Transportes Horizonte", "Logística Aurora", "Frota Campinas", "Entregas Rápidas Sul",
    "Cargas Litoral", "Distribuidora Vale", "Expresso Interior", "Coletas Metropolitanas"
];

const CITIES: Array<{ estado: string; cidade: string; cepPrefix: string }> = [
    { estado: "SP", cidade: "São Paulo", cepPrefix: "010" },
    { estado: "SP", cidade: "Campinas", cepPrefix: "130" },
    { estado: "RJ", cidade: "Rio de Janeiro", cepPrefix: "200" },
    { estado: "MG", cidade: "Belo Horizonte", cepPrefix: "301" },
    { estado: "PR", cidade: "Curitiba", cepPrefix: "800" },
    { estado: "RS", cidade: "Porto Alegre", cepPrefix: "900" },
    { estado: "BA", cidade: "Salvador", cepPrefix: "400" },
    { estado: "PE", cidade: "Recife", cepPrefix: "500" },
    { estado: "GO", cidade: "Goiânia", cepPrefix: "740" },
    { estado: "SC", cidade: "Florianópolis", cepPrefix: "880" }
];

const STREETS = [
    "Rua das Palmeiras", "Avenida Brasil", "Rua XV de Novembro", "Rua das Acácias",
    "Avenida Getúlio Vargas", "Rua São João", "Travessa das Flores", "Rua Amazonas",
    "Avenida Independência", "Rua do Comércio"
];

const NEIGHBORHOODS = [
    "Centro", "Jardim América", "Vila Nova", "Industrial", "Boa Vista",
    "Santa Cecília", "São José", "Alto da Colina"
];

const VEHICLE_MODELS = [
    "Gol", "Onix", "Civic", "Corolla", "Hilux", "Compass", "Kwid", "HB20",
    "Toro", "Strada", "Polo", "Tracker", "Renegade", "Cronos", "S10", "Amarok",
    "Cruze", "City", "Argo", "Spin"
];

const VEHICLE_TYPES = ["passeio", "utilitário", "caminhonete", "van", "moto"];

const SERVICE_NAMES = [
    "Troca de óleo", "Alinhamento e balanceamento", "Revisão preventiva",
    "Troca de pastilhas de freio", "Suspensão dianteira", "Ar condicionado",
    "Injeção eletrônica", "Troca de correia dentada", "Diagnóstico computadorizado",
    "Funilaria leve", "Pintura de para-lama", "Troca de amortecedores",
    "Higienização do ar", "Carga de bateria", "Troca de palhetas",
    "Filtro de combustível", "Geometria completa", "Escapamento"
];

const CARGO_DEFS = [
    { nome: "Consultor", nivelAcesso: migrateNivelAcesso("234") },
    { nome: "Financeiro", nivelAcesso: migrateNivelAcesso("46") },
    { nome: "Estoquista", nivelAcesso: migrateNivelAcesso("3") },
    { nome: "Atendente", nivelAcesso: migrateNivelAcesso("23") },
    { nome: "Auxiliar", nivelAcesso: migrateNivelAcesso("2") },
    { nome: "Supervisor", nivelAcesso: migrateNivelAcesso("2345") }
] as const;

const DIAGNOSTICOS_CLIENTE = [
    "Barulho na suspensão em piso irregular",
    "Carro puxando para a direita",
    "Ar condicionado gelando pouco",
    "Luz de injeção acesa no painel",
    "Pedal de freio baixo",
    "Vibração no volante em alta velocidade",
    "Consumo de óleo acima do normal",
    "Falha na partida pela manhã"
];

const DIAGNOSTICOS_MECANICO = [
    "Buchas da bandeja desgastadas",
    "Pneus com desgaste irregular",
    "Gás do ar abaixo do especificado",
    "Sensor de oxigênio irregular",
    "Pastilhas no fim da vida útil",
    "Amortecedores vazando",
    "Retentor de válvula comprometido",
    "Bateria com tensão baixa"
];

const PAGAMENTO_TIPOS = ["dinheiro", "pix", "credito", "debito", "boleto"] as const;

const EXTRA_FINANCE = [
    { nome: "Aluguel do galpão", tipo: "saida", valor: 4500 },
    { nome: "Energia elétrica", tipo: "saida", valor: 890 },
    { nome: "Água e esgoto", tipo: "saida", valor: 210 },
    { nome: "Internet e telefone", tipo: "saida", valor: 189 },
    { nome: "Compra de peças", tipo: "saida", valor: 1320 },
    { nome: "EPIs e uniformes", tipo: "saida", valor: 640 },
    { nome: "Software de gestão", tipo: "saida", valor: 299 },
    { nome: "Manutenção do compressor", tipo: "saida", valor: 470 },
    { nome: "Venda de sucata", tipo: "entrada", valor: 380 },
    { nome: "Consultoria avulsa", tipo: "entrada", valor: 750 }
] as const;

type Rng = () => number;

function createRng(seed: number): Rng {
    let state = seed >>> 0;

    return () => {
        state = (Math.imul(state + 0x6d2b79f5, 747796405) + 2891336453) >>> 0;
        const result = ((state ^ (state >>> 15)) >>> 0) / 4294967296;

        return result;
    };
}

function pick<T>(rng: Rng, items: readonly T[]): T {
    const item = items[Math.floor(rng() * items.length)];

    if (item === undefined) {
        throw new Error("Lista vazia");
    }

    return item;
}

function pickN<T>(rng: Rng, items: readonly T[], count: number): T[] {
    const copy = [...items];
    const selected: T[] = [];

    while (selected.length < count && copy.length > 0) {
        const index = Math.floor(rng() * copy.length);
        const item = copy.splice(index, 1)[0];

        if (item !== undefined) {
            selected.push(item);
        }
    }

    return selected;
}

function cpfDigit(nums: number[], initialFactor: number): number {
    let sum = 0;
    let factor = initialFactor;

    for (const value of nums) {
        sum += value * factor;
        factor -= 1;
    }

    const rest = (sum * 10) % 11;

    return rest === 10 ? 0 : rest;
}

function cpfFromSequence(sequence: number): string {
    const base = String(800000000 + sequence).padStart(9, "0").slice(-9);
    const nums = base.split("").map(Number);
    const d1 = cpfDigit(nums, 10);
    const d2 = cpfDigit([...nums, d1], 11);

    return `${base}${d1}${d2}`;
}

function cnpjDigit(nums: number[]): number {
    let factor = nums.length - 7;
    let sum = 0;

    for (const value of nums) {
        sum += value * factor;
        factor -= 1;

        if (factor < 2) {
            factor = 9;
        }
    }

    const result = 11 - (sum % 11);

    return result > 9 ? 0 : result;
}

function cnpjFromSequence(sequence: number): string {
    const base = String(340000000000 + sequence).padStart(12, "0").slice(-12);
    const nums = base.split("").map(Number);
    const d1 = cnpjDigit(nums);
    const d2 = cnpjDigit([...nums, d1]);

    return `${base}${d1}${d2}`;
}

function placaFromSequence(sequence: number): string {
    const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
    const n = sequence % (letters.length ** 3);

    const a = letters[Math.floor(n / (letters.length ** 2))] ?? "A";
    const b = letters[Math.floor(n / letters.length) % letters.length] ?? "A";
    const c = letters[n % letters.length] ?? "A";
    const digit = sequence % 10;
    const d = letters[(sequence * 3) % letters.length] ?? "A";
    const rest = String(100 + (sequence % 90)).slice(-2);

    return `${a}${b}${c}${digit}${d}${rest}`;
}

function chassiFromSequence(sequence: number): string {
    return `9BWZZZ377VT${String(100000 + sequence).slice(-6)}`;
}

function fullName(rng: Rng): string {
    return `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)} ${pick(rng, LAST_NAMES)}`;
}

function phone(rng: Rng): string {
    const ddd = pick(rng, ["11", "21", "31", "41", "51", "61", "71", "81", "19", "47"]);

    return `${ddd}9${String(80000000 + Math.floor(rng() * 19999999)).slice(-8)}`;
}

function daysAgo(rng: Rng, min: number, max: number): Date {
    const days = min + Math.floor(rng() * (max - min + 1));
    const date = new Date();

    date.setUTCDate(date.getUTCDate() - days);
    date.setUTCHours(12, 0, 0, 0);

    return date;
}

async function findMockCompany(): Promise<{ empresaId: number; db: AppDatabase } | null> {
    for (const empresaId of listLocalEmpresaIds()) {
        const db = openCompany(empresaId);
        const rows = await db.select().from(empresas).limit(1);

        if (rows[0]?.mock) {
            return { empresaId, db };
        }
    }

    return null;
}

export async function populateMock(): Promise<{ empresaId: number; created: boolean }> {
    let existing = await findMockCompany();
    let empresaId: number;
    let db: AppDatabase;
    let created = false;

    if (existing) {
        const realUsers = await existing.db
            .select({ cpf: usuarios.cpf })
            .from(usuarios)
            .where(eq(usuarios.mock, false));

        if (realUsers.length > 0) {
            existing = null;
        }
    }

    if (existing) {
        empresaId = existing.empresaId;
        db = existing.db;
        await clearMockInDatabase(db);
        await db.update(empresas).set({ mock: true, nome: MOCK_COMPANY_NAME }).where(eq(empresas.id, empresaId));
    } else {
        const createdCompany = await createCompanyDatabase(MOCK_COMPANY_NAME);

        empresaId = createdCompany.empresaId;
        db = createdCompany.db;
        created = true;
        await db.update(empresas).set({ mock: true }).where(eq(empresas.id, empresaId));
    }

    const rng = createRng(SEED);
    const passwordHash = await bcrypt.hash(MOCK_STAFF_PASSWORD, BCRYPT_ROUNDS);
    await db
        .insert(cargos)
        .values(CARGO_DEFS.map((cargo) => ({
            nome: cargo.nome,
            nivelAcesso: cargo.nivelAcesso,
            mock: MOCK
        })));
    const cargoRows = (await db.select().from(cargos)).filter(
        (cargo) => cargo.nome !== "Superadmin"
    );
    const cargoIds = cargoRows.map((row) => row.id);
    const staffCpfs: string[] = [];
    const mechanicCpfs: string[] = [];
    const userValues: Array<{
        cpf: string;
        nome: string;
        email: string;
        senha: string;
        ativo: boolean;
        senhaInicial: boolean;
        fundador: boolean;
        cargoId: number;
        empresaId: number;
        mock: boolean;
    }> = [{
        cpf: MOCK_LOGIN.cpf,
        nome: MOCK_LOGIN.nome,
        email: MOCK_LOGIN.email,
        senha: passwordHash,
        ativo: true,
        senhaInicial: false,
        fundador: true,
        cargoId: 1,
        empresaId,
        mock: MOCK
    }];

    for (let index = 0; index < MOCK_COUNTS.staff; index += 1) {
        const cargoId = cargoIds[index % cargoIds.length];
        const cargo = cargoRows[index % cargoRows.length];
        const cpf = cpfFromSequence(index + 1);

        if (cargoId === undefined || cargo === undefined) {
            continue;
        }

        staffCpfs.push(cpf);

        if (hasAccess(cargo.nivelAcesso, ACCESS.OS) || cargo.nome === "Mecânico") {
            mechanicCpfs.push(cpf);
        }

        userValues.push({
            cpf,
            nome: fullName(rng),
            email: `funcionario.${index + 1}@mock.mecarvit`,
            senha: passwordHash,
            ativo: index % 7 !== 0,
            senhaInicial: index % 5 === 0,
            fundador: false,
            cargoId,
            empresaId,
            mock: MOCK
        });
    }

    await db.insert(usuarios).values(userValues);

    const actorCpfs = [MOCK_LOGIN.cpf, ...staffCpfs.filter((_, index) => index % 7 !== 0)];
    const servicoRows = await db
        .insert(servicos)
        .values(SERVICE_NAMES.slice(0, MOCK_COUNTS.services).map((nome) => ({
            nome,
            mock: MOCK
        })))
        .returning();
    const servicoIds = servicoRows.map((row) => row.id);
    const clientDocs: string[] = [];
    const clienteValues = [];

    for (let index = 0; index < MOCK_COUNTS.clients; index += 1) {
        const isCompany = index % 5 === 0;
        const documento = isCompany ? cnpjFromSequence(index + 1) : cpfFromSequence(200 + index);
        const cadastradoPor = pick(rng, actorCpfs);

        clientDocs.push(documento);
        clienteValues.push({
            documento,
            nome: isCompany
                ? `${pick(rng, COMPANY_NAMES)} ${index + 1}`
                : fullName(rng),
            nomeSocial: !isCompany && index % 11 === 0 ? pick(rng, FIRST_NAMES) : null,
            cel: index % 8 === 0 ? null : phone(rng),
            email: index % 6 === 0 ? null : `cliente.${index + 1}@mock.cliente`,
            obs: index % 9 === 0 ? "Cliente recorrente da oficina mock." : null,
            ativo: index % 10 !== 0,
            usuarioCpf: cadastradoPor,
            mock: MOCK
        });
    }

    await db.insert(clientes).values(clienteValues);

    const enderecoValues = [];
    const enderecoLinks: Array<{ clienteDocumento: string; enderecoIndex: number }> = [];

    for (const documento of clientDocs) {
        const extras = rng() > 0.65 ? 2 : 1;

        for (let extra = 0; extra < extras; extra += 1) {
            const city = pick(rng, CITIES);

            enderecoLinks.push({
                clienteDocumento: documento,
                enderecoIndex: enderecoValues.length
            });
            enderecoValues.push({
                estado: city.estado,
                cidade: city.cidade,
                cep: `${city.cepPrefix}${String(10000 + Math.floor(rng() * 89999)).slice(-5)}`,
                bairro: pick(rng, NEIGHBORHOODS),
                rua: pick(rng, STREETS),
                numero: 10 + Math.floor(rng() * 1900),
                complemento: extra === 1 ? "Sala comercial" : "",
                mock: MOCK
            });
        }
    }

    const enderecoRows = await db.insert(enderecos).values(enderecoValues).returning();

    await db.insert(enderecosCliente).values(
        enderecoLinks.map((link) => {
            const endereco = enderecoRows[link.enderecoIndex];

            if (!endereco) {
                throw new Error("Endereço mock não gerado");
            }

            return {
                clienteDocumento: link.clienteDocumento,
                enderecoId: endereco.id,
                mock: MOCK
            };
        })
    );

    const veiculoValues = [];

    for (const [index, documento] of clientDocs.entries()) {
        const count = 1 + (index % 3 === 0 ? 1 : 0) + (index % 11 === 0 ? 1 : 0);

        for (let extra = 0; extra < count; extra += 1) {
            const sequence = index * 4 + extra;

            veiculoValues.push({
                modelo: pick(rng, VEHICLE_MODELS),
                placa: placaFromSequence(sequence + 1),
                tipo: pick(rng, VEHICLE_TYPES),
                kilometragem: 8000 + Math.floor(rng() * 140000),
                dataTrocaOleo: daysAgo(rng, 10, 400),
                chassi: chassiFromSequence(sequence + 1),
                ativo: extra === 0 || rng() > 0.15,
                clienteDocumento: documento,
                mock: MOCK
            });
        }
    }

    const veiculoRows = await db.insert(veiculos).values(veiculoValues).returning();
    const mechanics = mechanicCpfs.length > 0 ? mechanicCpfs : staffCpfs;
    const statusWeights = [
        STATUS_OS.ABERTA,
        STATUS_OS.ABERTA,
        STATUS_OS.PENDENTE,
        STATUS_OS.EM_ANDAMENTO,
        STATUS_OS.EM_ANDAMENTO,
        STATUS_OS.EM_ANDAMENTO,
        STATUS_OS.CONCLUIDA,
        STATUS_OS.CONCLUIDA,
        STATUS_OS.CONCLUIDA,
        STATUS_OS.CONCLUIDA,
        STATUS_OS.CANCELADA
    ] as const;

    for (let index = 0; index < MOCK_COUNTS.orders; index += 1) {
        const veiculo = veiculoRows[index % veiculoRows.length];

        if (!veiculo) {
            continue;
        }

        const statusOsId = pick(rng, statusWeights);
        const dataInicio = daysAgo(rng, 2, 400);
        const dataConclusao = statusOsId === STATUS_OS.CONCLUIDA || statusOsId === STATUS_OS.CANCELADA
            ? new Date(dataInicio.getTime() + (2 + Math.floor(rng() * 12)) * 86400000)
            : null;
        const itemCount = 1 + Math.floor(rng() * 3);
        const chosenServices = pickN(rng, servicoIds, itemCount);
        const itens = chosenServices.map((servicoId) => ({
            servicoId,
            quantidade: 1 + Math.floor(rng() * 2),
            valor: Number((80 + rng() * 420).toFixed(2))
        }));
        const total = itens.reduce((sum, item) => {
            return sum + item.quantidade * item.valor;
        }, 0);
        const shouldFinance = statusOsId === STATUS_OS.CONCLUIDA || (statusOsId === STATUS_OS.EM_ANDAMENTO && rng() > 0.55);
        let regEntradaSaidaId: number | null = null;

        if (shouldFinance) {
            const registro = await db
                .insert(registrosEntradaSaida)
                .values({
                    nome: `OS mock ${index + 1}`,
                    descricao: "Receita gerada pela ordem de serviço mock.",
                    dataLimitePagamento: dataConclusao ?? daysAgo(rng, 0, 20),
                    tipo: "entrada",
                    valor: Number(total.toFixed(2)),
                    usuarioCpf: pick(rng, actorCpfs),
                    mock: MOCK
                })
                .returning();
            const registroId = registro[0]?.id;

            if (registroId !== undefined) {
                regEntradaSaidaId = registroId;

                const paid = statusOsId === STATUS_OS.CONCLUIDA
                    ? Number(total.toFixed(2))
                    : Number((total * (0.3 + rng() * 0.4)).toFixed(2));

                await db.insert(pagamentos).values({
                    tipo: pick(rng, PAGAMENTO_TIPOS),
                    valor: paid,
                    regEntradaSaidaId: registroId,
                    mock: MOCK
                });
            }
        }

        const osRows = await db
            .insert(ordensServico)
            .values({
                dataInicio,
                dataConclusao,
                diagnosticoCliente: pick(rng, DIAGNOSTICOS_CLIENTE),
                diagnosticoMecanico: statusOsId === STATUS_OS.ABERTA ? null : pick(rng, DIAGNOSTICOS_MECANICO),
                obs: index % 8 === 0 ? "Aguardando peça de retrabalho." : null,
                veiculoId: veiculo.id,
                clienteDocumento: veiculo.clienteDocumento,
                regEntradaSaidaId,
                statusOsId,
                mock: MOCK
            })
            .returning();
        const osId = osRows[0]?.id;

        if (osId === undefined) {
            continue;
        }

        await db.insert(itensServico).values(
            itens.map((item) => ({
                ...item,
                ordemServicoId: osId,
                mock: MOCK
            }))
        );

        const responsavelCount = 1 + (rng() > 0.7 ? 1 : 0);
        const chosenMechanics = pickN(rng, mechanics, responsavelCount);

        await db.insert(responsaveis).values(
            chosenMechanics.map((usuarioCpf) => ({
                usuarioCpf,
                ordemServicoId: osId,
                mock: MOCK
            }))
        );
    }

    for (let index = 0; index < MOCK_COUNTS.extraFinance; index += 1) {
        const template = pick(rng, EXTRA_FINANCE);
        const valor = Number((template.valor * (0.7 + rng() * 0.8)).toFixed(2));
        const registro = await db
            .insert(registrosEntradaSaida)
            .values({
                nome: `${template.nome} ${index + 1}`,
                descricao: "Lançamento financeiro mock da oficina.",
                dataLimitePagamento: daysAgo(rng, 0, 90),
                tipo: template.tipo,
                valor,
                usuarioCpf: pick(rng, actorCpfs),
                mock: MOCK
            })
            .returning();
        const registroId = registro[0]?.id;

        if (registroId === undefined) {
            continue;
        }

        if (rng() > 0.25) {
            await db.insert(pagamentos).values({
                tipo: pick(rng, PAGAMENTO_TIPOS),
                valor: rng() > 0.3 ? valor : Number((valor * 0.5).toFixed(2)),
                regEntradaSaidaId: registroId,
                mock: MOCK
            });
        }
    }

    return { empresaId, created };
}

async function runCli() {
    if (env.isProduction && process.env.FORCE_MOCK !== "1") {
        console.error("Recusa: NODE_ENV=production. Use FORCE_MOCK=1 se realmente quiser popular mock.");
        process.exit(1);
    }

    console.log("Populando dados mock...");

    const result = await populateMock();
    const db = openCompany(result.empresaId);
    const usuariosMock = (await db.select().from(usuarios)).filter((row) => row.mock).length;
    const clientesMock = (await db.select().from(clientes)).filter((row) => row.mock).length;
    const veiculosMock = (await db.select().from(veiculos)).filter((row) => row.mock).length;
    const osMock = (await db.select().from(ordensServico)).filter((row) => row.mock).length;

    closeDatabase();

    console.log(result.created
        ? `Empresa mock criada: ${MOCK_COMPANY_NAME} (id ${result.empresaId}).`
        : `Empresa mock refeita: ${MOCK_COMPANY_NAME} (id ${result.empresaId}).`);
    console.log(`Registros mock: ${usuariosMock} usuários, ${clientesMock} clientes, ${veiculosMock} veículos, ${osMock} OS.`);
    console.log("Login superadmin:");
    console.log(`  email: ${MOCK_LOGIN.email}`);
    console.log(`  senha: ${MOCK_LOGIN.senha}`);
    console.log("Guia: docs/getting-started.md");
    console.log("Se o servidor estiver rodando, reinicie (`npm run dev`).");
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
