# Middlewares

Ficam em `src/middlewares/`. A ordem em que são montados está em [`app.ts`](./visao-geral.md#ciclo-de-uma-requisição).

| Middleware | Arquivo | O que faz |
| --- | --- | --- |
| `requestContext` | `requestContext.ts` | Grava em `req.requestedAt` a hora da requisição em ISO. Esse valor vira o `requestId` da [auditoria](./entidades/logs-de-auditoria.md). |
| `sanitize` | `sanitize.ts` | Passa `body`, `query` e `params` pelo `xss`, recursivamente em objetos e listas. Se falhar, responde 400 `Dados da requisição contêm conteúdo inválido`. |
| `actionLogger` | `actionLogger.ts` | Imprime no terminal data, método, URL, status (verde 2xx, amarelo 4xx, vermelho 5xx), IP e, se logado, nome do usuário e empresa. Usa o `PrettyConsole` do `cht-shared`. |
| `protect` | `protect.ts` | Autentica pelo token e carrega `req.user`, `req.empresaId` e `req.db`. Ver [autenticação](./autenticacao-e-acesso.md#protect). |
| `requirePasswordChanged` | `requireAccess.ts` | Bloqueia escritas enquanto o usuário tem senha inicial. |
| `requireAccess(chave)` | `requireAccess.ts` | Exige uma chave de permissão no cargo. |
| `requireGerente` | `requireGerente.ts` | Exige gerente ou superadmin. Protege o dashboard. |
| `notFound` | `notFound.ts` | Transforma qualquer rota não tratada em 404 `Rota não encontrada: METODO /url`. |
| `globalErrorHandler` | `errorHandler.ts` | Converte qualquer erro no formato `{ status, error: { message, fields?, empresas? } }`. |

## Tratamento de erros

`globalErrorHandler` normaliza o erro recebido:

- `AppError`: usa o `statusCode`, a mensagem e os `fields` que ele carrega.
- Erro do SQLite:
  - `UNIQUE` ou chave primária duplicada: 409 `Registro duplicado`, com o campo e uma mensagem pronta (`email` → `Email já cadastrado`, `cpf`, `documento`, `chassi`, `nome`; para outras colunas, `"<campo> já cadastrado"`).
  - `NOT NULL`: 400 `Campo obrigatório ausente`, com `"<coluna> é obrigatório"`.
- JSON malformado no corpo: 400 `JSON inválido no corpo da requisição`.
- Qualquer outro: 500 com a mensagem do erro.

Em produção, erros 5xx respondem `Erro interno do servidor`, sem vazar detalhes. Erros 5xx (e todos, fora de produção) são impressos no console.

O formato de saída é o contrato `ApiErrorResponse` do `cht-shared`, o mesmo que o formulário do frontend lê para mostrar a mensagem em cada campo (`fields`).
