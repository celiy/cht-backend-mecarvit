import { sql, type SQL } from "drizzle-orm";
import { PAYMENT_EPSILON } from "@shared/mecarvit/pagamentoSituacao";
import {
    STATUS_OS,
    itensServico,
    ordensServico,
    pagamentos,
    registrosEntradaSaida
} from "../db/schema/index.js";

/**
 * Sort rank for OS `pagamentoBadge` (mirrors `pagamentoSituacao`):
 * 0 Atrasado · 1 A vencer · 2 Não pago · 3 Pago · 4 Orçamento (—)
 */
export function osPagamentoBadgeSortSql(): SQL {
    const valor = sql`coalesce(
        (select ${registrosEntradaSaida.valor}
            from ${registrosEntradaSaida}
            where ${registrosEntradaSaida.id} = ${ordensServico.regEntradaSaidaId}),
        (select coalesce(sum(${itensServico.quantidade} * ${itensServico.valor}), 0)
            from ${itensServico}
            where ${itensServico.ordemServicoId} = ${ordensServico.id}),
        0
    )`;
    const pago = sql`coalesce(
        (select sum(${pagamentos.valor})
            from ${pagamentos}
            where ${pagamentos.regEntradaSaidaId} = ${ordensServico.regEntradaSaidaId}),
        0
    )`;
    const deadline = sql`coalesce(
        (select ${registrosEntradaSaida.dataLimitePagamento}
            from ${registrosEntradaSaida}
            where ${registrosEntradaSaida.id} = ${ordensServico.regEntradaSaidaId}),
        ${ordensServico.dataLimitePagamento}
    )`;

    return sql`case
        when ${ordensServico.statusOsId} = ${STATUS_OS.ORCAMENTO} then 4
        when ${valor} <= ${PAYMENT_EPSILON} and ${pago} <= ${PAYMENT_EPSILON} then 2
        when ${pago} + ${PAYMENT_EPSILON} >= ${valor} then 3
        when ${deadline} is null then 2
        when strftime('%Y-%m-%d', ${deadline}, 'unixepoch') < strftime('%Y-%m-%d', 'now') then 0
        else 1
    end`;
}

/**
 * Sort rank for registro `pagamentoBadge` (same situacao ranks, no orçamento).
 */
export function registroPagamentoBadgeSortSql(): SQL {
    const pago = sql`coalesce(
        (select sum(${pagamentos.valor})
            from ${pagamentos}
            where ${pagamentos.regEntradaSaidaId} = ${registrosEntradaSaida.id}),
        0
    )`;

    return sql`case
        when ${registrosEntradaSaida.valor} <= ${PAYMENT_EPSILON} and ${pago} <= ${PAYMENT_EPSILON} then 2
        when ${pago} + ${PAYMENT_EPSILON} >= ${registrosEntradaSaida.valor} then 3
        when ${registrosEntradaSaida.dataLimitePagamento} is null then 2
        when strftime('%Y-%m-%d', ${registrosEntradaSaida.dataLimitePagamento}, 'unixepoch')
            < strftime('%Y-%m-%d', 'now') then 0
        else 1
    end`;
}
