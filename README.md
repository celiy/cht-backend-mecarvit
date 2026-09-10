# cht-backend-mecarvit

Backend específico do cliente Mecarvit (núcleo do TCC).

## O que é

API local Express + SQLite + Drizzle. Cada oficina é um arquivo `data/empresas/{id}.sqlite`. O gestor cria a empresa em `POST /api/cadastro`.

## Contrato

- Prefixo `/api`. JSON em português (`cpf`, `nome`, `senha`, `documento`, `criadoEm`).
- Públicas: `POST /api/cadastro`, `POST /api/login`, `GET /api/empresa-locais`.
- `/health` na raiz (Electron).
- Autenticadas com JWT `{ sub: cpf, email, empresaId }`.
- Não há `DELETE` de usuário: só `PATCH` `ativo`.

O login antigo do frontend (`/api/auth` com `name`/`password`) não é mais válido. Exemplos das rotas estão em `docs/routes/`.

## Desenvolvimento

```bash
npm run dev
npm run tests
npm run db:reset
```

`npm run db:reset` apaga todos os SQLite em `EMPRESAS_DIR` (e o arquivo legado `data/mecarvit.sqlite`). Recusado em `production` salvo `FORCE_RESET=1`. Reinicie o servidor depois.

Em `NODE_ENV !== production`, o stdin aceita `document-routes` e `run-tests`.

`EMPRESAS_DIR` aponta para o diretório dos SQLite (padrão `./data/empresas`).
