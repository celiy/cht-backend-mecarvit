# Ferramentas de desenvolvimento

## Scripts do `package.json`

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe a API com `tsx watch` (reinicia ao salvar). |
| `npm start` | Sobe a API uma vez (usado no app desktop). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run tests` | Roda os [testes](./testes.md) com Vitest. |
| `npm run db:generate` | Gera uma migração a partir do schema (`drizzle-kit`). |
| `npm run db:migrate` | Aplica as migrações em todas as oficinas existentes. |
| `npm run db:mock` | Cria ou refaz as oficinas de demonstração. |
| `npm run db:mock:clear` | Remove só os registros `mock = true`. |
| `npm run db:reset` | Remove as oficinas mock e os registros mock das reais. |
| `npm run docs:routes` | Gera `docs/routes/` a partir das rotas montadas. |

## Dados de demonstração (`src/db/mock/`)

`npm run db:mock` cria duas oficinas mock (**Oficina Mock Mecarvit** e **Oficina Mock Norte**) com muitos registros: 48 funcionários, 220 clientes, 24 serviços, 900 ordens de serviço e 600 lançamentos financeiros extras por oficina, com datas espalhadas por cerca de 6 anos para os gráficos do dashboard terem histórico. Cada registro gerado tem `mock = true`.

- Login do superadmin em ambas: `superadmin@mock.mecarvit` / `Mock1234`. Há também dois funcionários compartilhados entre as oficinas, preferindo os cargos Gerente e Mecânico, e o login deles pede para escolher a oficina.
- Rodar de novo limpa só o que é mock e popula outra vez.
- `npm run db:mock:clear` apaga os registros `mock = true` em todas as oficinas, sem mexer em cadastros reais.
- Em `NODE_ENV=production` o seed recusa rodar, a menos que `FORCE_MOCK=1`.

Passo a passo para usar: [primeiros passos](./getting-started.md).

## Reset (`src/db/reset.ts`)

- `npm run db:reset`: apaga do disco as oficinas que são só mock e limpa os registros mock das oficinas reais. Cadastros reais ficam.
- `FORCE_RESET_ALL=1 npm run db:reset`: apaga **todos** os SQLite, mock e reais, e o arquivo antigo `DB_PATH`.
- Em produção recusa, a menos que `FORCE_RESET=1`.
- Depois do reset, reinicie o servidor, que mantém conexões abertas em memória.

## REPL (`src/repl/`)

Em desenvolvimento e com terminal interativo, o servidor mostra o prompt `mecarvit>`:

| Comando | Efeito |
| --- | --- |
| `document-routes` | Regenera `docs/routes/`. |
| `run-tests` | Executa `npm run tests`. |
| `help` ou `?` | Lista os comandos. |

Não sobe em produção, em testes nem sem terminal.

## Documentação das rotas (`docs/routes/`)

`documentRoutes` percorre as rotas do Express, agrupa por recurso e escreve um arquivo `_<recurso>.md` com **exemplo de requisição e resposta** de cada rota. Os exemplos vêm de `repl/routeExamples.ts`; ao criar uma rota nova, acrescente o exemplo lá e rode `npm run docs:routes`. Esses arquivos são gerados: não edite à mão.
