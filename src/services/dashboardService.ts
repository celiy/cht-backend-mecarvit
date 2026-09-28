import { eq, ne } from "drizzle-orm";
import type { AppDatabase } from "../config/database.js";
import {
    STATUS_OS,
    itensServico,
    ordensServico,
    pagamentos,
    registrosEntradaSaida,
    statusOs
} from "../db/schema/index.js";
import {
    PAGAMENTO_SITUACAO,
    isRegistroFullyPaid,
    pagamentoSituacao,
    type PagamentoSituacao
} from "@shared/mecarvit/pagamentoSituacao";
import { AppError } from "../utils/AppError.js";

export type DashboardPeriodo = "esta_semana" | "este_mes" | "6_meses" | "em_geral";
export type DashboardMeses = 6 | 12;
export type FluxoPagoTipo = "entrada" | "saida" | "comparativo";

const PERIODOS: DashboardPeriodo[] = ["esta_semana", "este_mes", "6_meses", "em_geral"];

export function parseDashboardPeriodo(raw: unknown): DashboardPeriodo {
    if (typeof raw !== "string" || !raw.trim()) {
        return "esta_semana";
    }

    const value = raw.trim() as DashboardPeriodo;

    if (!PERIODOS.includes(value)) {
        throw new AppError("periodo inválido", 400, {
            periodo: "Use esta_semana, este_mes, 6_meses ou em_geral"
        });
    }

    return value;
}

export function parseDashboardMeses(raw: unknown): DashboardMeses {
    if (raw === undefined || raw === null || raw === "") {
        return 6;
    }

    const n = Number(raw);

    if (n === 6 || n === 12) {
        return n;
    }

    throw new AppError("meses inválido", 400, { meses: "Use 6 ou 12" });
}

export function parseFluxoPagoTipo(raw: unknown): FluxoPagoTipo {
    if (typeof raw !== "string" || !raw.trim()) {
        return "entrada";
    }

    const value = raw.trim() as FluxoPagoTipo;

    if (value === "entrada" || value === "saida" || value === "comparativo") {
        return value;
    }

    throw new AppError("tipo inválido", 400, {
        tipo: "Use entrada, saida ou comparativo"
    });
}

function startOfLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);

    next.setDate(next.getDate() + days);

    return next;
}

/** Inclusive `[start, end]` for dashboard period filters. `em_geral` → null. */
export function periodRange(
    periodo: DashboardPeriodo,
    now = new Date()
): { start: Date; end: Date } | null {
    const end = new Date(now);
    const today = startOfLocalDay(now);

    if (periodo === "em_geral") {
        return null;
    }

    if (periodo === "esta_semana") {
        const day = today.getDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;

        return { start: addDays(today, mondayOffset), end };
    }

    if (periodo === "este_mes") {
        return {
            start: new Date(today.getFullYear(), today.getMonth(), 1),
            end
        };
    }

    return {
        start: new Date(today.getFullYear(), today.getMonth() - 5, 1),
        end
    };
}

/**
 * Deadline window for a vencer / atrasado cards.
 * For `esta_semana`, include the last 6 days before today so Monday still has
 * atrasados (calendar week alone has no past day on Monday).
 */
export function deadlinePeriodRange(
    periodo: DashboardPeriodo,
    now = new Date()
): { start: Date; end: Date } | null {
    if (periodo !== "esta_semana") {
        return periodRange(periodo, now);
    }

    const today = startOfLocalDay(now);
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = addDays(today, mondayOffset);
    const weekEnd = addDays(weekStart, 6);
    const rollingStart = addDays(today, -6);
    const start = rollingStart.getTime() < weekStart.getTime() ? rollingStart : weekStart;

    return {
        start,
        end: weekEnd.getTime() > now.getTime() ? weekEnd : now
    };
}

function inRange(date: Date | null | undefined, range: { start: Date; end: Date } | null): boolean {
    if (!range) {
        return true;
    }

    if (date == null) {
        return false;
    }

    const t = date instanceof Date ? date.getTime() : new Date(date).getTime();

    if (Number.isNaN(t)) {
        return false;
    }

    return t >= range.start.getTime() && t <= range.end.getTime();
}

function toDate(value: Date | string | number | null | undefined): Date | null {
    if (value == null || value === "") {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthBuckets(
    meses: DashboardMeses,
    now = new Date()
): Array<{ key: string; year: number; month: number }> {
    const buckets: Array<{ key: string; year: number; month: number }> = [];
    const cursor = new Date(now.getFullYear(), now.getMonth() - (meses - 1), 1);

    for (let i = 0; i < meses; i += 1) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth() + 1;

        buckets.push({
            key: `${year}-${String(month).padStart(2, "0")}`,
            year,
            month
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }

    return buckets;
}

type RegistroRow = typeof registrosEntradaSaida.$inferSelect;
type PagamentoRow = typeof pagamentos.$inferSelect;

async function loadRegistrosWithPagamentos(db: AppDatabase): Promise<
    Array<{
        registro: RegistroRow;
        pagamentos: PagamentoRow[];
        valorPago: number;
        paidAt: Date | null;
    }>
> {
    const rows = await db.select().from(registrosEntradaSaida);
    const result = [];

    for (const registro of rows) {
        const pagamentoRows = await db
            .select()
            .from(pagamentos)
            .where(eq(pagamentos.regEntradaSaidaId, registro.id));
        const valorPago = pagamentoRows.reduce((sum, row) => sum + Number(row.valor), 0);
        let paidAt: Date | null = null;

        if (isRegistroFullyPaid(Number(registro.valor), valorPago) && pagamentoRows.length > 0) {
            for (const row of pagamentoRows) {
                const created = toDate(row.criadoEm);

                if (!created) {
                    continue;
                }

                if (!paidAt || created.getTime() > paidAt.getTime()) {
                    paidAt = created;
                }
            }
        }

        result.push({ registro, pagamentos: pagamentoRows, valorPago, paidAt });
    }

    return result;
}

export async function financeiroCards(db: AppDatabase, periodo: DashboardPeriodo) {
    const range = periodRange(periodo);
    const loaded = await loadRegistrosWithPagamentos(db);
    const totals = {
        entradaPago: 0,
        saidaPago: 0,
        entradaAVencer: 0,
        saidaAVencer: 0,
        entradaAtrasado: 0,
        saidaAtrasado: 0
    };

    for (const entry of loaded) {
        const tipo = entry.registro.tipo === "saida" ? "saida" : "entrada";
        const situacao = pagamentoSituacao({
            valor: Number(entry.registro.valor),
            valorPago: entry.valorPago,
            dataLimitePagamento: entry.registro.dataLimitePagamento
        });
        const valor = Number(entry.registro.valor);

        if (situacao === PAGAMENTO_SITUACAO.PAGO) {
            if (inRange(entry.paidAt, range)) {
                if (tipo === "entrada") {
                    totals.entradaPago += valor;
                } else {
                    totals.saidaPago += valor;
                }
            }

            continue;
        }

        const deadline = toDate(entry.registro.dataLimitePagamento);
        const deadlineRange = deadlinePeriodRange(periodo);

        if (!inRange(deadline, deadlineRange)) {
            continue;
        }

        if (situacao === PAGAMENTO_SITUACAO.A_VENCER) {
            if (tipo === "entrada") {
                totals.entradaAVencer += valor;
            } else {
                totals.saidaAVencer += valor;
            }
        } else if (situacao === PAGAMENTO_SITUACAO.ATRASADO) {
            if (tipo === "entrada") {
                totals.entradaAtrasado += valor;
            } else {
                totals.saidaAtrasado += valor;
            }
        }
    }

    const round = (n: number) => Number(n.toFixed(2));

    return {
        periodo,
        entradaPago: round(totals.entradaPago),
        saidaPago: round(totals.saidaPago),
        entradaAVencer: round(totals.entradaAVencer),
        saidaAVencer: round(totals.saidaAVencer),
        entradaAtrasado: round(totals.entradaAtrasado),
        saidaAtrasado: round(totals.saidaAtrasado)
    };
}

export async function fluxoPago(db: AppDatabase, meses: DashboardMeses, tipo: FluxoPagoTipo) {
    const buckets = monthBuckets(meses);
    const byKey = new Map(buckets.map((b) => [b.key, { entrada: 0, saida: 0 }]));
    const loaded = await loadRegistrosWithPagamentos(db);

    for (const entry of loaded) {
        if (!entry.paidAt) {
            continue;
        }

        const key = monthKey(entry.paidAt);
        const bucket = byKey.get(key);

        if (!bucket) {
            continue;
        }

        const valor = Number(entry.registro.valor);

        if (entry.registro.tipo === "saida") {
            bucket.saida += valor;
        } else {
            bucket.entrada += valor;
        }
    }

    const items = buckets.map((bucket) => {
        const values = byKey.get(bucket.key) ?? { entrada: 0, saida: 0 };
        const date = new Date(bucket.year, bucket.month - 1, 1);

        if (tipo === "comparativo") {
            return {
                date: date.toISOString(),
                value: Number((values.entrada - values.saida).toFixed(2))
            };
        }

        const value = tipo === "saida" ? values.saida : values.entrada;

        return {
            date: date.toISOString(),
            value: Number(value.toFixed(2))
        };
    });

    return { meses, tipo, items };
}

async function osValorAndPago(
    db: AppDatabase,
    os: typeof ordensServico.$inferSelect
): Promise<{ valor: number; valorPago: number; dataLimite: Date | null }> {
    let valor = 0;
    let valorPago = 0;
    let dataLimite = toDate(os.dataLimitePagamento);

    if (os.regEntradaSaidaId) {
        const resRows = await db
            .select()
            .from(registrosEntradaSaida)
            .where(eq(registrosEntradaSaida.id, os.regEntradaSaidaId))
            .limit(1);
        const registro = resRows[0];

        if (registro) {
            valor = Number(registro.valor);
            dataLimite = toDate(registro.dataLimitePagamento) ?? dataLimite;
        }

        const pagamentoRows = await db
            .select()
            .from(pagamentos)
            .where(eq(pagamentos.regEntradaSaidaId, os.regEntradaSaidaId));

        valorPago = pagamentoRows.reduce((sum, row) => sum + Number(row.valor), 0);
    } else {
        const itemRows = await db
            .select({
                quantidade: itensServico.quantidade,
                valor: itensServico.valor
            })
            .from(itensServico)
            .where(eq(itensServico.ordemServicoId, os.id));

        valor = itemRows.reduce((sum, item) => sum + item.quantidade * Number(item.valor), 0);
    }

    return { valor, valorPago, dataLimite };
}

function osInPeriod(
    os: typeof ordensServico.$inferSelect,
    range: { start: Date; end: Date } | null
): boolean {
    if (!range) {
        return true;
    }

    return inRange(toDate(os.criadoEm), range) || inRange(toDate(os.modificadoEm), range);
}

export async function osPorStatus(db: AppDatabase, periodo: DashboardPeriodo) {
    const range = periodRange(periodo);
    const statuses = await db.select().from(statusOs).where(ne(statusOs.id, STATUS_OS.ORCAMENTO));
    const orders = await db
        .select()
        .from(ordensServico)
        .where(ne(ordensServico.statusOsId, STATUS_OS.ORCAMENTO));
    const counts = new Map<number, number>();

    for (const status of statuses) {
        counts.set(status.id, 0);
    }

    for (const os of orders) {
        if (!osInPeriod(os, range)) {
            continue;
        }

        counts.set(os.statusOsId, (counts.get(os.statusOsId) ?? 0) + 1);
    }

    return {
        periodo,
        items: statuses.map((status) => ({
            group: status.nome,
            value: counts.get(status.id) ?? 0
        }))
    };
}

export async function osPorPagamento(db: AppDatabase, periodo: DashboardPeriodo) {
    const range = periodRange(periodo);
    const orders = await db
        .select()
        .from(ordensServico)
        .where(ne(ordensServico.statusOsId, STATUS_OS.ORCAMENTO));
    const counts: Record<PagamentoSituacao, number> = {
        [PAGAMENTO_SITUACAO.PAGO]: 0,
        [PAGAMENTO_SITUACAO.A_VENCER]: 0,
        [PAGAMENTO_SITUACAO.NAO_PAGO]: 0,
        [PAGAMENTO_SITUACAO.ATRASADO]: 0
    };

    for (const os of orders) {
        if (!osInPeriod(os, range)) {
            continue;
        }

        const { valor, valorPago, dataLimite } = await osValorAndPago(db, os);
        const situacao = pagamentoSituacao({
            valor,
            valorPago,
            dataLimitePagamento: dataLimite
        });

        counts[situacao] += 1;
    }

    const order: PagamentoSituacao[] = [
        PAGAMENTO_SITUACAO.NAO_PAGO,
        PAGAMENTO_SITUACAO.A_VENCER,
        PAGAMENTO_SITUACAO.ATRASADO,
        PAGAMENTO_SITUACAO.PAGO
    ];

    return {
        periodo,
        items: order.map((group) => ({
            group,
            value: counts[group]
        }))
    };
}
