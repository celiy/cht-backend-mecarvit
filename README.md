# cht-backend-mecarvit

Backend específico do cliente Mecarvit (núcleo do TCC).

## O que é

API local Express + SQLite + Drizzle. Cada oficina é um arquivo `data/empresas/{id}.sqlite`. O gestor cria a empresa em `POST /api/cadastro`.

## Repositórios do ecossistema

| Repositório | Papel |
| --- | --- |
| [cht-main](https://github.com/celiy/cht-main) | Orquestração do workspace: `install`, runner, build e Electron. |
| [cht-base](https://github.com/celiy/cht-base) | Shell Vue/Vite que carrega o frontend do cliente e inicia este backend no app desktop. |
| [cht-design-system](https://github.com/celiy/cht-design-system) | Componentes de UI. |
| [cht-shared](https://github.com/celiy/cht-shared) | Validadores, contratos e regras de domínio usados por este backend (alias `@shared`). |
| [cht-client-mecarvit](https://github.com/celiy/cht-client-mecarvit) | Frontend que consome esta API. |

## Documentação

A pasta [`docs/`](./docs/README.md) explica cada parte do backend, em português: arquitetura, banco, autenticação e permissões, middlewares, tempo real, testes e **uma página por recurso** (rotas, controller, serviço e regras de negócio).

Comece por [`docs/visao-geral.md`](./docs/visao-geral.md). O índice completo está em [`docs/README.md`](./docs/README.md).

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
npm run db:mock
npm run db:mock:clear
npm run db:reset
```

Primeiro uso: `docs/getting-started.md`. `npm run db:mock` cria a oficina de demonstração (superadmin `superadmin@mock.mecarvit` / `Mock1234`) com muitos registros marcados `mock = true`. `npm run db:mock:clear` remove só esses registros.

`npm run db:reset` apaga todos os SQLite em `EMPRESAS_DIR` (e o arquivo legado `data/mecarvit.sqlite`). Recusado em `production` salvo `FORCE_RESET=1`. Reinicie o servidor depois.

Em `NODE_ENV !== production`, o stdin aceita `document-routes` e `run-tests`.

`EMPRESAS_DIR` aponta para o diretório dos SQLite (padrão `./data/empresas`).
