import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import {
    closeDatabase,
    createCompanyDatabase,
    listLocalEmpresaIds,
    openCompany,
    removeCompanyFiles,
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
    osReaberturas,
    responsaveis,
    servicos,
    STATUS_OS,
    usuarios,
    veiculos
} from "../schema/index.js";
import { clearMockInDatabase } from "./clear.js";
import {
    MOCK_COMPANY_NAMES,
    MOCK_COUNTS,
    MOCK_LOGIN,
    MOCK_SHARED_STAFF,
    MOCK_STAFF_PASSWORD
} from "./constants.js";
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

function startOfLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function addLocalDays(date: Date, days: number): Date {
    const next = new Date(date);

    next.setDate(next.getDate() + days);

    return startOfLocalDay(next);
}

function mondayOfWeek(now = new Date()): Date {
    const today = startOfLocalDay(now);
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    return addLocalDays(today, mondayOffset);
}

function randomBetween(rng: Rng, start: Date, end: Date): Date {
    const a = start.getTime();
    const b = end.getTime();
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);

    if (hi <= lo) {
        return startOfLocalDay(new Date(lo));
    }

    return startOfLocalDay(new Date(lo + rng() * (hi - lo)));
}

function daysAgo(rng: Rng, min: number, max: number): Date {
    const days = min + Math.floor(rng() * (max - min + 1));

    return addLocalDays(new Date(), -days);
}

function daysFromNow(rng: Rng, min: number, max: number): Date {
    const days = min + Math.floor(rng() * (max - min + 1));

    return addLocalDays(new Date(), days);
}

/**
 * Event dates mixed across ~2 years, current month, and a light current-week slice.
 */
function mockEventDate(rng: Rng, now = new Date()): Date {
    const today = startOfLocalDay(now);
    const weekStart = mondayOfWeek(now);
    const weekEnd = addLocalDays(weekStart, 6);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0, 0);
    const roll = rng();

    if (roll < 0.08) {
        return randomBetween(rng, weekStart, today);
    }

    if (roll < 0.18) {
        return randomBetween(rng, monthStart, today);
    }

    if (roll < 0.55) {
        return daysAgo(rng, 0, 180);
    }

    if (roll < 0.85) {
        return daysAgo(rng, 180, 900);
    }

    if (roll < 0.92) {
        return randomBetween(rng, today, weekEnd);
    }

    return daysFromNow(rng, 1, 180);
}

/** Deadlines for a vencer / atrasado / null (Não pago). */
function mockDeadline(rng: Rng, now = new Date()): Date | null {
    const today = startOfLocalDay(now);
    const weekEnd = addLocalDays(mondayOfWeek(now), 6);
    const roll = rng();

    if (roll < 0.12) {
        return null;
    }

    // Recent past (incl. days before Monday) → atrasado visível em "esta semana".
    if (roll < 0.32) {
        return daysAgo(rng, 1, 6);
    }

    if (roll < 0.48) {
        return daysAgo(rng, 7, 120);
    }

    if (roll < 0.78) {
        return randomBetween(rng, today, weekEnd);
    }

    return daysFromNow(rng, 1, 240);
}

/**
 * Payment dates spread across the last 6 years (72 months) so yearly fluxo
 * charts have history. Small slice stays in the current week for card filters.
 */
function mockPaidAt(rng: Rng, now = new Date()): Date {
    const today = startOfLocalDay(now);
    const weekStart = mondayOfWeek(now);
    const roll = rng();

    if (roll < 0.08) {
        return randomBetween(rng, weekStart, today);
    }

    const monthsBack = Math.floor(rng() * 72);
    const monthStart = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1, 12, 0, 0, 0);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() - monthsBack + 1, 0, 12, 0, 0, 0);
    const end = monthEnd.getTime() > today.getTime() ? today : monthEnd;

    return randomBetween(rng, monthStart, end);
}

async function listMockOnlyCompanies(): Promise<Array<{ empresaId: number; db: AppDatabase }>> {
    const found: Array<{ empresaId: number; db: AppDatabase }> = [];

    for (const empresaId of listLocalEmpresaIds()) {
        const db = openCompany(empresaId);
        const empresa = (await db.select().from(empresas).limit(1))[0];
        const realUsers = await db
            .select({ cpf: usuarios.cpf })
            .from(usuarios)
            .where(eq(usuarios.mock, false));

        if (empresa?.mock === true && realUsers.length === 0) {
            found.push({ empresaId, db });
        }
    }

    return found;
}

function cargoIdByName(
    cargoRows: Array<{ id: number; nome: string }>,
    nome: string
): number | undefined {
    return cargoRows.find((cargo) => cargo.nome === nome)?.id;
}

async function fillMockCompany(
    db: AppDatabase,
    empresaId: number,
    options: { officeIndex: number; passwordHash: string }
): Promise<void> {
    const rng = createRng(SEED + options.officeIndex * 7919);
    const passwordHash = options.passwordHash;
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

    for (const [sharedIndex, shared] of MOCK_SHARED_STAFF.entries()) {
        const preferredName = sharedIndex === 0 ? "Gerente" : "Mecânico";
        const cargoId = cargoIdByName(cargoRows, preferredName)
            ?? cargoIds[sharedIndex % cargoIds.length];

        if (cargoId === undefined) {
            continue;
        }

        staffCpfs.push(shared.cpf);

        const sharedCargo = cargoRows.find((cargo) => cargo.id === cargoId);
        const nivel = sharedCargo?.nivelAcesso ?? "";

        if (preferredName === "Mecânico" || hasAccess(nivel, ACCESS.OS)) {
            mechanicCpfs.push(shared.cpf);
        }

        userValues.push({
            cpf: shared.cpf,
            nome: shared.nome,
            email: shared.email,
            senha: passwordHash,
            ativo: true,
            senhaInicial: false,
            fundador: false,
            cargoId,
            empresaId,
            mock: MOCK
        });
    }

    for (let index = 0; index < MOCK_COUNTS.staff; index += 1) {
        const cargoId = cargoIds[index % cargoIds.length];
        const cargo = cargoRows[index % cargoRows.length];
        const cpf = cpfFromSequence(index + 1 + options.officeIndex * 200);

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
            email: `funcionario.${index + 1}.o${options.officeIndex + 1}@mock.mecarvit`,
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
        STATUS_OS.CANCELADA,
        STATUS_OS.ORCAMENTO,
        STATUS_OS.ORCAMENTO,
        STATUS_OS.REABERTA
    ] as const;

    for (let index = 0; index < MOCK_COUNTS.orders; index += 1) {
        const veiculo = veiculoRows[index % veiculoRows.length];

        if (!veiculo) {
            continue;
        }

        const forceReaberta = index < 4;
        const statusOsId = forceReaberta ? STATUS_OS.REABERTA : pick(rng, statusWeights);
        const dataInicio = forceReaberta ? new Date() : mockEventDate(rng);
        const criadoEm = dataInicio;
        const modificadoEm = forceReaberta
            ? dataInicio
            : rng() < 0.4
                ? mockEventDate(rng)
                : criadoEm;
        const dataConclusao = statusOsId === STATUS_OS.CONCLUIDA || statusOsId === STATUS_OS.CANCELADA
            ? addLocalDays(dataInicio, 2 + Math.floor(rng() * 12))
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
        const shouldFinance =
            statusOsId !== STATUS_OS.ORCAMENTO
            && statusOsId !== STATUS_OS.CANCELADA
            && (statusOsId === STATUS_OS.CONCLUIDA || rng() > 0.25);
        let regEntradaSaidaId: number | null = null;
        // Null deadline + unpaid → "Não pago" (pagamentoSituacao).
        let dataLimitePagamento: Date | null = statusOsId === STATUS_OS.ORCAMENTO
            ? null
            : mockDeadline(rng);

        if (shouldFinance) {
            const payRoll = rng();
            const paid =
                payRoll < 0.5
                    ? Number(total.toFixed(2))
                    : payRoll < 0.75
                        ? Number((total * (0.25 + rng() * 0.5)).toFixed(2))
                        : 0;
            // Unpaid with no deadline → Não pago; unpaid with deadline → a vencer/atrasado.
            const deadline = paid > 0
                ? (dataLimitePagamento ?? mockDeadline(rng) ?? daysFromNow(rng, 1, 30))
                : dataLimitePagamento;
            const registro = await db
                .insert(registrosEntradaSaida)
                .values({
                    nome: `OS mock ${index + 1}`,
                    descricao: "Receita gerada pela ordem de serviço mock.",
                    dataLimitePagamento: deadline,
                    tipo: "entrada",
                    valor: Number(total.toFixed(2)),
                    usuarioCpf: pick(rng, actorCpfs),
                    criadoEm,
                    modificadoEm,
                    mock: MOCK
                })
                .returning();
            const registroId = registro[0]?.id;

            if (registroId !== undefined) {
                regEntradaSaidaId = registroId;
                dataLimitePagamento = deadline;

                if (paid > 0) {
                    const paidAt = mockPaidAt(rng);

                    await db.insert(pagamentos).values({
                        tipo: pick(rng, PAGAMENTO_TIPOS),
                        valor: paid,
                        regEntradaSaidaId: registroId,
                        criadoEm: paidAt,
                        modificadoEm: paidAt,
                        mock: MOCK
                    });
                }
            }
        }

        const osRows = await db
            .insert(ordensServico)
            .values({
                dataInicio,
                dataConclusao,
                dataLimitePagamento: regEntradaSaidaId ? null : dataLimitePagamento,
                diagnosticoCliente: pick(rng, DIAGNOSTICOS_CLIENTE),
                diagnosticoMecanico: statusOsId === STATUS_OS.ABERTA || statusOsId === STATUS_OS.ORCAMENTO
                    ? null
                    : pick(rng, DIAGNOSTICOS_MECANICO),
                obs: index % 8 === 0 ? "Aguardando peça de retrabalho." : null,
                veiculoId: veiculo.id,
                clienteDocumento: veiculo.clienteDocumento,
                regEntradaSaidaId,
                statusOsId,
                criadoEm,
                modificadoEm,
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

        if (statusOsId === STATUS_OS.REABERTA) {
            await db.insert(osReaberturas).values({
                ordemServicoId: osId,
                reabertoEm: modificadoEm,
                responsaveisJson: JSON.stringify(
                    chosenMechanics.map((cpf) => ({ cpf, nome: cpf }))
                ),
                criadoEm: modificadoEm,
                modificadoEm,
                mock: MOCK
            });
        }
    }

    for (let index = 0; index < MOCK_COUNTS.extraFinance; index += 1) {
        const template = pick(rng, EXTRA_FINANCE);
        const valor = Number((template.valor * (0.7 + rng() * 0.8)).toFixed(2));
        const criadoEm = mockEventDate(rng);
        const deadline = mockDeadline(rng);
        const registro = await db
            .insert(registrosEntradaSaida)
            .values({
                nome: `${template.nome} ${index + 1}`,
                descricao: "Lançamento financeiro mock da oficina.",
                dataLimitePagamento: deadline,
                tipo: template.tipo,
                valor,
                usuarioCpf: pick(rng, actorCpfs),
                criadoEm,
                modificadoEm: criadoEm,
                mock: MOCK
            })
            .returning();
        const registroId = registro[0]?.id;

        if (registroId === undefined) {
            continue;
        }

        const payRoll = rng();

        if (payRoll > 0.18) {
            const paidAt = mockPaidAt(rng);
            const paidValor =
                payRoll > 0.5 ? valor : Number((valor * (0.3 + rng() * 0.5)).toFixed(2));

            await db.insert(pagamentos).values({
                tipo: pick(rng, PAGAMENTO_TIPOS),
                valor: paidValor,
                regEntradaSaidaId: registroId,
                criadoEm: paidAt,
                modificadoEm: paidAt,
                mock: MOCK
            });
        }
    }

    // Guaranteed burst for current dashboard windows (esta_semana / este_mes never empty).
    await seedDashboardBurst(db, rng, actorCpfs);
}

/**
 * Guaranteed slices for card filters + evenly spread paid history for monthly charts.
 * Avoid dumping a huge paid pile into the current month.
 */
async function seedDashboardBurst(
    db: AppDatabase,
    rng: Rng,
    actorCpfs: string[]
): Promise<void> {
    const now = new Date();
    const today = startOfLocalDay(now);
    const weekStart = mondayOfWeek(now);
    const weekEnd = addLocalDays(weekStart, 6);
    const burst: Array<{
        tipo: "entrada" | "saida";
        nome: string;
        valor: number;
        deadline: Date | null;
        paid: boolean;
        paidAt?: Date;
        criadoEm: Date;
    }> = [];

    // Modest paid volume this week (cards), small valores.
    for (let i = 0; i < 16; i += 1) {
        const tipo = i % 2 === 0 ? "entrada" : "saida";
        const paidAt = randomBetween(rng, weekStart, today);

        burst.push({
            tipo,
            nome: `Burst pago semana ${tipo} ${i + 1}`,
            valor: Number((120 + rng() * 480).toFixed(2)),
            deadline: paidAt,
            paid: true,
            paidAt,
            criadoEm: paidAt
        });
    }

    // Paid history: ~6 lançamentos / mês × 72 meses (6 years for yearly chart).
    for (let monthsBack = 0; monthsBack < 72; monthsBack += 1) {
        const monthStart = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1, 12, 0, 0, 0);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() - monthsBack + 1, 0, 12, 0, 0, 0);
        const end = monthEnd.getTime() > today.getTime() ? today : monthEnd;

        for (let i = 0; i < 6; i += 1) {
            const tipo = i % 2 === 0 ? "entrada" : "saida";
            const paidAt = randomBetween(rng, monthStart, end);

            burst.push({
                tipo,
                nome: `Burst pago mês-${monthsBack} ${tipo} ${i + 1}`,
                valor: Number((180 + rng() * 720).toFixed(2)),
                deadline: paidAt,
                paid: true,
                paidAt,
                criadoEm: paidAt
            });
        }
    }

    for (let i = 0; i < 36; i += 1) {
        const tipo = i % 2 === 0 ? "entrada" : "saida";

        burst.push({
            tipo,
            nome: `Burst a vencer ${tipo} ${i + 1}`,
            valor: Number((150 + rng() * 900).toFixed(2)),
            deadline: randomBetween(rng, today, weekEnd),
            paid: false,
            criadoEm: randomBetween(rng, weekStart, today)
        });
    }

    // Always past 1–6 days → atrasado even on Monday (pairs with deadlinePeriodRange).
    for (let i = 0; i < 48; i += 1) {
        const tipo = i % 2 === 0 ? "entrada" : "saida";

        burst.push({
            tipo,
            nome: `Burst atrasado ${tipo} ${i + 1}`,
            valor: Number((160 + rng() * 980).toFixed(2)),
            deadline: daysAgo(rng, 1, 6),
            paid: false,
            criadoEm: daysAgo(rng, 10, 90)
        });
    }

    for (let i = 0; i < 36; i += 1) {
        const tipo = i % 2 === 0 ? "entrada" : "saida";

        burst.push({
            tipo,
            nome: `Burst não pago ${tipo} ${i + 1}`,
            valor: Number((120 + rng() * 800).toFixed(2)),
            deadline: null,
            paid: false,
            criadoEm: mockEventDate(rng, now)
        });
    }

    for (const item of burst) {
        const registro = await db
            .insert(registrosEntradaSaida)
            .values({
                nome: item.nome,
                descricao: "Lançamento forçado para popular filtros do dashboard.",
                dataLimitePagamento: item.deadline,
                tipo: item.tipo,
                valor: item.valor,
                usuarioCpf: pick(rng, actorCpfs),
                criadoEm: item.criadoEm,
                modificadoEm: item.criadoEm,
                mock: MOCK
            })
            .returning();
        const registroId = registro[0]?.id;

        if (registroId === undefined) {
            continue;
        }

        if (item.paid && item.paidAt) {
            await db.insert(pagamentos).values({
                tipo: pick(rng, PAGAMENTO_TIPOS),
                valor: item.valor,
                regEntradaSaidaId: registroId,
                criadoEm: item.paidAt,
                modificadoEm: item.paidAt,
                mock: MOCK
            });
        }
    }
}

export async function populateMock(): Promise<{
    empresaId: number;
    created: boolean;
    empresas: Array<{ empresaId: number; created: boolean; nome: string }>;
}> {
    const existing = await listMockOnlyCompanies();
    const passwordHash = await bcrypt.hash(MOCK_STAFF_PASSWORD, BCRYPT_ROUNDS);
    const seeded: Array<{ empresaId: number; created: boolean; nome: string }> = [];

    for (const [officeIndex, nome] of MOCK_COMPANY_NAMES.entries()) {
        const reuse = existing[officeIndex];
        let empresaId: number;
        let db: AppDatabase;
        let created = false;

        if (reuse) {
            empresaId = reuse.empresaId;
            db = reuse.db;
            await clearMockInDatabase(db);
            await db.update(empresas).set({ mock: true, nome }).where(eq(empresas.id, empresaId));
        } else {
            const createdCompany = await createCompanyDatabase(nome);

            empresaId = createdCompany.empresaId;
            db = createdCompany.db;
            created = true;
            await db.update(empresas).set({ mock: true }).where(eq(empresas.id, empresaId));
        }

        await fillMockCompany(db, empresaId, { officeIndex, passwordHash });
        seeded.push({ empresaId, created, nome });
    }

    for (const extra of existing.slice(MOCK_COMPANY_NAMES.length)) {
        removeCompanyFiles(extra.empresaId);
    }

    const first = seeded[0];

    if (!first) {
        throw new Error("Nenhuma oficina mock gerada");
    }

    return {
        empresaId: first.empresaId,
        created: first.created,
        empresas: seeded
    };
}

async function runCli() {
    if (env.isProduction && process.env.FORCE_MOCK !== "1") {
        console.error("Recusa: NODE_ENV=production. Use FORCE_MOCK=1 se realmente quiser popular mock.");
        process.exit(1);
    }

    console.log("Populando dados mock...");

    const result = await populateMock();

    closeDatabase();

    for (const company of result.empresas) {
        console.log(company.created
            ? `Empresa mock criada: ${company.nome} (id ${company.empresaId}).`
            : `Empresa mock refeita: ${company.nome} (id ${company.empresaId}).`);
    }

    console.log(`Senha padrão: ${MOCK_STAFF_PASSWORD}`);
    console.log(`Login superadmin (nas ${result.empresas.length} oficinas): ${MOCK_LOGIN.email}`);

    for (const shared of MOCK_SHARED_STAFF) {
        console.log(`Login compartilhado: ${shared.email}`);
    }

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
