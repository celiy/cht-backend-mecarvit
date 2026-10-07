# Registros de entrada e saída

O financeiro é uma lista de **lançamentos** (`reg_entrada_saida`). Cada um é uma **entrada** (dinheiro que a oficina recebe) ou uma **saída** (dinheiro que ela paga), com um valor, um prazo opcional e uma lista de **pagamentos** que o vão quitando.

| Item | Arquivo |
| --- | --- |
| Rotas | `src/routes/registroRoutes.ts` |
| Controller | `src/controllers/registroController.ts` |
| Serviço | `src/services/registroService.ts` |
| Pagamentos | `src/services/pagamentoSync.ts` |

Exemplos: [`routes/_regentradasaida.md`](../routes/_regentradasaida.md).

## Rotas

Todas exigem `financeiro.editar`.

| Método e caminho | O que faz |
| --- | --- |
| `GET /api/regentradasaida` | Lista com filtros, ordenação e paginação. |
| `POST /api/regentradasaida` | Cria. Status 201. |
| `GET /api/regentradasaida/:id` | Detalhe. |
| `PUT` / `PATCH /api/regentradasaida/:id` | Atualiza. |
| `DELETE /api/regentradasaida/:id` | Exclui. Status 204. |

## Listagem

Além de `page`, `limit`, `sort` e filtros por coluna (`tipo`, `nome`, …):

| Parâmetro | Efeito |
| --- | --- |
| `ordemServicoId` | Um ou mais ids de OS separados por vírgula: só os lançamentos gerados por elas. |
| `pagamentoSituacao` | `pago`, `nao_pago`, `a_vencer` ou `atrasado`. |
| `dataLimitePagamento` | Um dia, `aaaa-mm-dd` (UTC). |
| `sort` | Além das colunas, `valorLabel`, `pagoLabel` e `pagamentoBadge`. |

O frontend usa duas listas independentes (entradas e saídas), filtrando por `tipo`.

## O que o lançamento devolve

As colunas, mais `pagamentos` (lista) e `ordemServico` (a OS que o gerou, ou `null`).

## Situação de pagamento

Calculada, nunca gravada. Dado `valor`, o total pago e o prazo (regra em `pagamentoSituacao` do `cht-shared`):

| Situação | Quando |
| --- | --- |
| **Pago** | Total pago cobre o valor (com tolerância de menos de um centavo). |
| **Atrasado** | Não está pago e o prazo é anterior a hoje (comparando só o dia, em UTC). |
| **A vencer** | Não está pago e o prazo é hoje ou futuro. |
| **Não pago** | Não está pago e não há prazo (ou o valor e o pago são zero). |

## Criação

Obrigatórios: `tipo` (`entrada` ou `saida`), `nome` e `valor`. Opcionais: `descricao` (`observacao` também é aceito), `dataLimitePagamento` e `pagamentos`. O tipo é gravado em minúsculas e o usuário que criou fica registrado.

Cada pagamento tem `tipo` e `valor` (maior que zero). A soma dos pagamentos não pode passar o valor do lançamento (400).

## Atualização

`PUT` e `PATCH` aceitam parcialmente os campos. Quanto a `pagamentos`:

- `PUT` **substitui** a lista inteira.
- `PATCH` **acrescenta** à lista atual.
- A soma é conferida contra o valor (o novo, se vier no mesmo pedido).

### Lançamentos gerados por OS

Uma entrada criada por uma [ordem de serviço](./ordens-de-servico.md#registro-financeiro-gerado-syncfinanceiro) tem restrições:

- Continua sendo `entrada` (409 se tentar mudar o tipo).
- O `valor` não pode ser alterado: ele é a soma dos itens da OS (409).
- Não pode ser excluída por aqui (409 `Registro ligado a ordem de serviço deve ser gerenciado pela OS`).

Pagamentos e prazo continuam editáveis. O frontend, ao registrar um pagamento em uma entrada de OS, envia para a rota da OS.

## Auditoria

Criar, alterar e excluir registram `reg-entrada-saida` na [auditoria](./logs-de-auditoria.md). Lançamentos não avisam em tempo real.
