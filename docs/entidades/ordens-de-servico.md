# Ordens de serviço

A OS (ordem de serviço) é o centro do sistema: liga um **cliente** a um **veículo**, lista os **serviços** feitos (itens), os **responsáveis**, o **status** e, quando há dinheiro envolvido, gera o **registro financeiro** correspondente.

| Item | Arquivo |
| --- | --- |
| Rotas | `src/routes/ordemServicoRoutes.ts` |
| Controller | `src/controllers/ordemServicoController.ts` |
| Serviço | `src/services/ordemServicoService.ts` |
| Pagamentos | `src/services/pagamentoSync.ts` |
| Ordenação por pagamento | `src/utils/pagamentoSituacaoSortSql.ts` |

Exemplos de requisição e resposta: [`routes/_ordem-servico.md`](../routes/_ordem-servico.md) e [`_status-os.md`](../routes/_status-os.md).

## Rotas

Todas as rotas de `/api/ordem-servico` exigem `os.editar`. Dentro delas, o controller exige permissões mais específicas.

| Método e caminho | Permissão adicional | O que faz |
| --- | --- | --- |
| `GET /api/status-os` | qualquer usuário autenticado | Lista os status possíveis. |
| `GET /api/ordem-servico` | — | Lista com filtros, ordenação e paginação. |
| `POST /api/ordem-servico` | `os.criar` | Cria. Status 201. |
| `GET /api/ordem-servico/:id` | — | Detalhe. |
| `PUT` / `PATCH /api/ordem-servico/:id` | `os.pagamentos` se o corpo só traz `pagamentos` | Atualiza. Quem não tem `os.criar` só pode a edição limitada (abaixo). |
| `DELETE /api/ordem-servico/:id` | `os.excluir` | Exclui. Status 204. |

## Status

São sete, com os mesmos ids de `OS_STATUS` no `cht-shared`:

| Id | Status |
| --- | --- |
| 1 | aberta |
| 2 | pendente |
| 3 | em andamento |
| 4 | concluída |
| 5 | cancelada |
| 6 | orçamento |
| 7 | reaberta |

As transições permitidas (por exemplo, concluída só vai para reaberta) estão em `osStatus` no `cht-shared` e são aplicadas pelo **frontend**. O backend só confere que o status existe (400 `Status inválido`). Na **criação**, o status inicial vem do corpo (padrão `aberta`). Na **edição**, só o gerente muda o status; para os demais o campo é ignorado.

## Listagem

`GET /api/ordem-servico` aceita, além de `page`, `limit` e `sort`:

| Parâmetro | Efeito |
| --- | --- |
| `cliente` | Texto parcial no nome ou no documento do cliente. |
| `veiculo` | Um id de veículo, ou texto parcial no modelo ou na placa. |
| `statusOsId` | Filtro por coluna (`3`, por exemplo). |
| `pagamentoSituacao` | `pago`, `nao_pago`, `a_vencer` ou `atrasado` (`todos` ou vazio não filtra). Orçamentos nunca entram. |
| `dataLimitePagamento` | Um dia, `aaaa-mm-dd`: OS cujo prazo de pagamento cai nesse dia (UTC). |
| `sort` | Além das colunas, aceita `idLabel`, `clienteNome`, `veiculoLabel`, `statusBadge` e `pagamentoBadge`. |

Cada item da lista é o mesmo objeto do detalhe.

## O que a OS devolve

Além das colunas da tabela, `getOrdemServico` monta:

- `cliente` (`nome`, `cel`), `clienteNome` e `veiculo` (`modelo`, `placa`, `kilometragem`, `tipo`);
- `status` (`id`, `nome`);
- `itens` (`servicoId`, `servicoNome`, `quantidade`, `valor`);
- `responsaveis`: lista de CPFs;
- `pagamentos` e `registroEntradaSaida` (com os pagamentos), quando existe;
- `total`: soma de `quantidade × valor` dos itens;
- `pagamentoSituacao`: `Pago`, `A vencer`, `Não pago`, `Atrasado`, ou `null` em orçamento.

### O que cada permissão enxerga (`presentOrdemServico`)

O objeto passa por um filtro antes de sair:

| Sem a permissão | O que some |
| --- | --- |
| `clientes.pii` | `clienteDocumento` vira vazio e o celular do cliente vira `null`. |
| `os.pagamentos` | As listas de pagamentos saem vazias. |
| `financeiro.editar` ou `financeiro.criar` | O prazo de pagamento (`dataLimitePagamento`) sai `null`. |

## Criação

Obrigatórios: `clienteDocumento` e `veiculoId`. O cliente precisa existir (404) e o veículo precisa **pertencer a esse cliente** (400).

Regras:

- Status padrão: `aberta`. `dataInicio` é a hora da criação. Se já nasce `concluída`, `dataConclusao` também é preenchida.
- `itens`: cada item traz `servicoId` ou `servicoNome` (que cria o serviço se não existir), `quantidade` (inteiro positivo) e `valor` (maior que zero).
- `responsaveis`: lista de CPFs de funcionários.
- `pagamentos`: só quem tem `os.pagamentos`. **Orçamento não aceita pagamentos** (409).
- `dataLimitePagamento`: só é gravado por quem pode mexer em financeiro.

Depois de gravar, o serviço sincroniza o financeiro (próxima seção).

## Registro financeiro gerado (`syncFinanceiro`)

A OS e o lançamento financeiro andam juntos:

1. O **valor** do lançamento é sempre a soma dos itens (duas casas). Ele é recalculado a cada alteração.
2. O lançamento existe quando a OS tem pagamentos **ou** está concluída. Quando não há mais motivo, ele é apagado (junto com os pagamentos).
3. Ao ser criado, é uma **entrada**, chamada `dd/mm/aaaa - OS #id`, em nome de quem fez a alteração, e herda o prazo de pagamento da OS. A partir daí o lançamento é o dono do prazo: editar o prazo no financeiro não é sobrescrito por uma cópia antiga na OS.
4. A soma dos pagamentos não pode passar o valor (400 `A soma dos pagamentos não pode ser maior que o valor do lançamento`).
5. Uma OS **cancelada** não recebe pagamentos (409).
6. `PUT` substitui a lista de pagamentos; `PATCH` **acrescenta** aos existentes. Pagamentos já existentes mantêm id e data de criação (ver [Pagamentos](#pagamentos)).

### Pagamentos

`replacePagamentos` atualiza a lista sem reescrever o que não mudou: pagamentos com `id` conhecido ficam, e só têm `modificadoEm` atualizado se `tipo` ou `valor` mudaram; os sem `id` são criados; os que não vieram são apagados. O `tipo` é gravado em minúsculas. Tipos aceitos: dinheiro, crédito, débito, pix, boleto, transferência, cheque e outro.

## Atualização

### Edição completa (quem tem `os.criar`)

`clienteDocumento`, `veiculoId`, `statusOsId` (só gerente), `diagnosticoCliente` (só gerente), `diagnosticoMecanico`, `obs`, `dataLimitePagamento` (quem mexe em financeiro), `itens`, `responsaveis` e `pagamentos` (`os.pagamentos`).

`dataInicio` e `dataConclusao` não são editáveis: o sistema as define (início na criação, conclusão pelo status).

- Os itens e os responsáveis enviados **substituem** os atuais.
- Mudar o status ajusta `dataConclusao`: concluída mantém a data existente (ou usa agora); qualquer outro status a limpa.
- Se a OS vai de **concluída para reaberta**, grava uma linha em `os_reabertura` com os responsáveis daquele momento. O dashboard usa esse histórico.

### Edição limitada (quem não tem `os.criar`)

Só `diagnosticoMecanico`, `obs` e `itens`. É o caso do mecânico, que preenche o diagnóstico e os serviços sem mexer no resto. O `PUT` é tratado como parcial nesse caso.

### Só pagamentos

Um corpo com **apenas** `pagamentos` exige `os.pagamentos`. É o que o modal de pagamentos do frontend envia.

## Exclusão

Uma OS que já tem itens, pagamentos ou registro financeiro **não pode** ser excluída: 409 `Ordem de serviço com histórico operacional não pode ser excluída`. Na prática, só OS vazias são apagadas.

## Auditoria

Criar, alterar e excluir registram `ordem-servico` na [auditoria](./logs-de-auditoria.md), com o estado antes e depois já filtrado pelas permissões de quem agiu.
