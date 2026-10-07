# Dashboard

Dados dos gráficos e cartões da tela inicial do gerente. São só leituras, calculadas na hora a partir das OS, dos lançamentos e dos pagamentos.

| Item | Arquivo |
| --- | --- |
| Rotas | `src/routes/dashboardRoutes.ts` |
| Controller | `src/controllers/dashboardController.ts` |
| Serviço | `src/services/dashboardService.ts` |
| Check | `src/services/dashboardService.check.ts` |

Exemplos: [`routes/_dashboard.md`](../routes/_dashboard.md).

## Acesso

Todas as rotas exigem **gerente ou superadmin** (`requireGerente`). Quem não é gerente recebe 403.

## Rotas

| Método e caminho | Parâmetros | O que devolve |
| --- | --- | --- |
| `GET /api/dashboard/financeiro-cards` | `periodo` | Seis totais em reais, descritos abaixo. |
| `GET /api/dashboard/fluxo-pago` | `meses`, `tipo` | Valores pagos por mês (ou por ano). |
| `GET /api/dashboard/os-status` | `periodo` | Quantidade de OS por status. |
| `GET /api/dashboard/os-pagamento` | `periodo` | Quantidade de OS por situação de pagamento. |
| `GET /api/dashboard/os-reabertas` | `periodo` | Reaberturas agrupadas por dia ou mês. |
| `GET /api/dashboard/os-reabertas/list` | `periodo`, `bucket`, `page`, `limit` | Lista das OS reabertas em um dos grupos. |

Todas respondem `{ data: … }`.

## Parâmetros

| Nome | Valores | Padrão |
| --- | --- | --- |
| `periodo` | `esta_semana`, `este_mes`, `6_meses`, `em_geral` | `esta_semana` |
| `meses` | `6`, `12`, `72` (72 = seis anos, agrupado por ano) | `6` |
| `tipo` | `entrada`, `saida`, `comparativo` | `entrada` |

Valor fora da lista responde 400 com a dica dos valores aceitos.

### Intervalos de `periodo`

| Período | Intervalo |
| --- | --- |
| `esta_semana` | Da segunda-feira até agora. |
| `este_mes` | Do dia 1º do mês até agora. |
| `6_meses` | Do dia 1º de cinco meses atrás até agora. |
| `em_geral` | Sem limite. |

## Cartões financeiros

`financeiro-cards` devolve `entradaPago`, `saidaPago`, `entradaAVencer`, `saidaAVencer`, `entradaAtrasado` e `saidaAtrasado`, além do `periodo`. Cada lançamento entra por sua [situação de pagamento](./registros-financeiros.md#situação-de-pagamento):

- **Pago**: conta em `…Pago` se o **último pagamento** que o quitou caiu no período.
- **A vencer** e **Atrasado**: contam pelo **prazo** do lançamento. Em `esta_semana`, a janela de prazo inclui os seis dias anteriores a hoje, para a segunda-feira ainda mostrar atrasados.

Os valores são o total do lançamento, arredondado a duas casas.

## Fluxo pago

`fluxo-pago` devolve `{ meses, tipo, items }`. Cada item tem `date` (início do mês, ou do ano em `meses=72`), `value`, `entrada` e `saida`. Só entram lançamentos totalmente pagos, no mês do último pagamento.

- `entrada` e `saida`: `value` é o total daquele tipo.
- `comparativo`: `value` é entrada menos saída.

Os meses sem movimento aparecem zerados, para o gráfico não ter buracos.

## OS por status e por pagamento

- `os-status`: uma entrada por status (menos orçamento), com a quantidade de OS **criadas ou modificadas** no período.
- `os-pagamento`: contagem de OS (menos orçamento) por situação de pagamento, na ordem Não pago, A vencer, Atrasado e Pago. A situação usa o lançamento da OS, ou a soma dos itens quando o lançamento ainda não existe.

## OS reabertas

`os-reabertas` conta, por dia (semana e mês) ou por mês (6 meses e geral), as OS que **estão reabertas agora** e cuja última reabertura caiu no período. Cada item traz `group` (rótulo, por exemplo `15/03` ou `Mar/26`), `value` e `id` (o grupo bruto, usado no filtro abaixo).

`os-reabertas/list` devolve `{ items, total, page, limit }` com as OS de um grupo (`bucket`): `id`, `clienteNome`, `veiculoLabel` e os `responsaveis` **no momento da reabertura**. Funcionários que foram removidos aparecem como `Funcionário removido`. `limit` vai até 50 (padrão 10).
