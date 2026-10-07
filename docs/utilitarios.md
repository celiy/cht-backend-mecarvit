# Utilitários

Pequenos módulos de `src/utils/` usados pelos controllers e serviços.

## Erros e fluxo

| Módulo | Função |
| --- | --- |
| `AppError` | Erro operacional com `statusCode`, `fields` (mensagem por campo) e, no login, `empresas`. É o único tipo de erro que os serviços lançam de propósito. |
| `catchAsync(fn)` | Envolve um handler `async` para que a rejeição vá ao `globalErrorHandler`. Todo controller usa. |
| `validate.ts` | `throwIfInvalid(erros)` lança `AppError` 400 `Validação falhou` com os campos; `bodyOf(req)` devolve o corpo como objeto. |
| `http.ts` | `requireDb`, `requireUser` (lançam 401 se faltar), `parseId` (inteiro positivo, senão 400) e `defaultAtivoQuery`. |

### `defaultAtivoQuery`

Listas de entidades com `ativo` escondem os inativos por padrão. O helper acrescenta `ativo=true` à consulta, a menos que ela peça inativos (`ativo=false`, `ativo=inativo`) ou ambos (`ativo=ativo,inativo`, caso em que o filtro é removido).

## Listagem: `ApiFeatures`

Monta consultas de lista a partir da query string, para qualquer tabela Drizzle:

```ts
const features = new ApiFeatures(db, tabela, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

const rows = await features.exec();
const total = await features.count();
```

| Parâmetro | Efeito |
| --- | --- |
| `campo=valor` | Filtra pela coluna. Texto usa busca parcial sem diferenciar maiúsculas; CPF, CNPJ e telefone com pontuação casam com colunas só de dígitos. Número e data usam igualdade. Booleanos aceitam `true`/`false` e, para `ativo`, `ativo`/`inativo`. |
| `campo[gte]`, `[gt]`, `[lte]`, `[lt]` | Comparação (datas e números). |
| `sort=campo,-outro` | Ordenação; `-` inverte. Aceita apelidos registrados com `sortAlias` (por exemplo `clienteNome`, que ordena por uma subconsulta). |
| `fields=a,b` | Limita as colunas devolvidas. |
| `page`, `limit` | Paginação (padrão: página 1, 10 por página). Página além do total responde 404 `Esta página não existe`. |

Nomes reservados (`sort`, `page`, `limit`, `fields`, `cliente`, `veiculo`, `paga`, `ordemServicoId`) não viram filtro de coluna; os controllers de OS e financeiro tratam alguns deles com filtros próprios (`whereExtra`). Os nomes de campo aceitam `camelCase` ou `snake_case`.

As respostas de lista têm o formato `{ data, page, limit, total }`.

## Corpo da requisição: `nested.ts`

Converte partes do JSON em tipos seguros:

- `bodyOptionalString` / `bodyOptionalPhone`: campo ausente vira `undefined` (não mexer); `null` ou texto vazio vira `null` (limpar); celular vira só dígitos.
- `asItens`, `asPagamentos`, `asResponsaveis`, `asEnderecoIds`, `asEnderecos`, `asVeiculos`: leem listas aninhadas e devolvem `undefined` se o campo não é uma lista. `asItens` aceita o formato antigo (`valorObra` + `valorPecas`) e soma.
- `isPagamentosOnlyBody`: verdadeiro quando o corpo só traz `pagamentos`, o caso do modal de pagamentos do frontend.

## Datas, endereços e SQL

| Módulo | Função |
| --- | --- |
| `utcDayRange` | Converte `aaaa-mm-dd` no intervalo `[início, fim]` daquele dia em UTC. Usado nos filtros por prazo de pagamento. Data inválida: 400. |
| `enderecoNormalize` | Normaliza e compara endereços (estado em maiúsculas, CEP só dígitos, textos aparados). |
| `pagamentoSituacaoSortSql` | Expressões SQL que classificam OS e lançamentos pela situação de pagamento (0 atrasado, 1 a vencer, 2 não pago, 3 pago, 4 orçamento), para ordenar listas no banco. Espelham `pagamentoSituacao` do `cht-shared`. |

## Sessão e rede

| Módulo | Função |
| --- | --- |
| `jwt` | `signToken` e `verifyToken` (valida `sub`, `email` e `empresaId`). |
| `authCookie` | Gravar, apagar e ler o cookie `cht_auth`. Ver [autenticação](./autenticacao-e-acesso.md). |
| `access` | Reexporta as regras de permissão do `cht-shared`. |
| `findListenPort` | `listenOnAvailablePort`: tenta a porta pedida e as seguintes. |
| `audit` | `recordAudit(req, …)`: grava uma entrada de [auditoria](./entidades/logs-de-auditoria.md) com o ator e os dados da requisição. |
| `schedules` | Agenda, às 03:00 UTC, a remoção de logs de auditoria com mais de 6 meses. |
