# Configuração

## Variáveis de ambiente

Lidas em `src/config/env.ts` (via `dotenv`). O arquivo `.env.example` traz um ponto de partida: copie-o para `.env`.

| Variável | Padrão | Função |
| --- | --- | --- |
| `NODE_ENV` | `development` | Em `production`, erros 5xx não expõem a mensagem real e o REPL não sobe. |
| `HOST` | `127.0.0.1` | Endereço onde o servidor escuta. |
| `PORT` | `3001` | Porta inicial. `0` pede uma porta livre ao sistema (usado no Electron). |
| `PORT_SCAN_LIMIT` | `20` | Quantas portas seguintes tentar quando a inicial está ocupada. |
| `EMPRESAS_DIR` | `./data/empresas` | Pasta com um SQLite por oficina e os logs de auditoria. |
| `DB_PATH` | `./data/mecarvit.sqlite` | Arquivo antigo de banco único. Só é removido pelo `db:reset`. |
| `JWT_SECRET` | `change-me-please` (só fora de produção) | Segredo dos tokens. Em produção é obrigatório e não pode ser o valor de exemplo. |
| `JWT_EXPIRES_IN` | `7d` | Validade do token e do cookie (`s`, `m`, `h` ou `d`). |
| `CORS_ORIGINS` | lista vazia | Origens permitidas, separadas por vírgula. |
| `BCRYPT_ROUNDS` | `12` | Custo do hash de senha (os testes usam `4`). |
| `FORCE_RESET`, `FORCE_RESET_ALL` | — | Liberam o `db:reset` (ver [banco de dados](./banco-de-dados.md)). |

`resolveJwtSecret` falha ao subir em produção sem `JWT_SECRET` ou com o valor de exemplo, para que um segredo esquecido não gere tokens forjáveis.

## Subida do servidor (`server.ts`)

1. Aplica as migrações em todos os bancos de empresa que já existem (`runMigrations`).
2. Cria o app Express (`createApp`) e o servidor HTTP.
3. Anexa o [WebSocket](./tempo-real.md) ao mesmo servidor HTTP.
4. Escuta em `PORT`. Se estiver ocupada, tenta as portas seguintes até `PORT_SCAN_LIMIT` (`listenOnAvailablePort`).
5. Imprime `Servidor iniciado em http://host:porta` e uma linha `CHT_API_URL=http://host:porta`. Essa linha é como o Electron e o frontend descobrem a porta real.
6. Inicia o [REPL](./ferramentas-de-desenvolvimento.md) (só em desenvolvimento, com terminal interativo).
7. Importa `utils/schedules.ts`, que agenda a limpeza diária dos [logs de auditoria](./entidades/logs-de-auditoria.md).

No desligamento (`SIGINT`, `SIGTERM`, rejeição não tratada) ele fecha o servidor HTTP, o WebSocket e todos os bancos abertos. Uma exceção não capturada encerra o processo com erro.

## Montagem do app (`app.ts`)

- `trust proxy = 1`, para o IP real vir de um proxy reverso.
- CORS com `credentials: true`. Para cada origem loopback (`localhost`, `127.0.0.1`, `[::1]`) ele também libera as outras duas, porque o navegador as trata como origens diferentes e o app desktop carrega por `127.0.0.1`. Sem `CORS_ORIGINS`, aceita qualquer origem.
- `express.static("public")`, `GET /ip` (devolve o IP do cliente) e `GET /health` (`{ status: "ok", at }`, usado pelo frontend e pelo Electron para achar a API).
- Rotas inexistentes caem em `notFound` (404).

## Cookies

O token vai em um cookie `cht_auth` (`httpOnly`, `secure`, `sameSite: none`). Detalhes em [autenticação e acesso](./autenticacao-e-acesso.md).
