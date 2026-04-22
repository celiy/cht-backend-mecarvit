# cht-backend-mecarvit

Backend do cliente **Mecarvit**. Express + TypeScript (ESM) + SQLite (Drizzle ORM).

## Stack

- **Runtime/dev:** `tsx` (executa TS sem build, resolve `paths` do tsconfig).
- **HTTP:** `express` + `helmet` + `hpp` + `cors` + `cookie-parser` + `xss`.
- **Banco:** `better-sqlite3` (sync, embutido) acessado via **Drizzle ORM** (schema em TS puro, sem SQL cru).
- **Validação/tipos:** biblioteca compartilhada em `../cht-shared/src/*`, importada via alias `@shared/*`.

## Pré-requisitos

- Node.js 20+ (recomendado 22+).
- O workspace pai deve conter `cht-shared/` ao lado de `cht-backend-mecarvit/`.

## Setup

```bash
cd cht-backend-mecarvit
npm install
cp .env.example .env        # ajuste PORT, JWT_SECRET, CORS_ORIGINS, etc.
npm run db:migrate          # aplica migrações (também é feito no boot do server)
npm run dev
```

Servidor: `http://127.0.0.1:8000` (ou o `PORT` configurado).

## Scripts

| Script              | O que faz                                                         |
|---------------------|-------------------------------------------------------------------|
| `npm run dev`       | `tsx watch src/server.ts` — hot reload.                           |
| `npm start`         | `tsx src/server.ts` — execução simples.                           |
| `npm run typecheck` | `tsc --noEmit` — valida todos os tipos (inclui `@shared/*`).      |
| `npm run db:generate` | Gera nova migração a partir das mudanças em `src/db/schema/*`. |
| `npm run db:migrate`  | Aplica todas as migrações pendentes em `DB_PATH`.              |

## Estrutura

```
src/
  server.ts             bootstrap (env, migrações, listen, signals)
  app.ts                compõe middlewares + rotas
  config/
    env.ts              leitura tipada de process.env
    database.ts         init do better-sqlite3 + drizzle + migrate()
  db/
    schema/users.ts     sqliteTable users (id, name, email, password, createdAt)
    schema/index.ts     re-export central
    migrations/         .sql gerados pelo drizzle-kit
    migrate.ts          CLI de db:migrate
  middlewares/
    requestContext.ts   req.requestedAt
    sanitize.ts         xss em body/query/params
    notFound.ts         404 -> AppError
    errorHandler.ts     globalErrorHandler (ApiErrorResponse)
  utils/
    AppError.ts         erro operacional com `fields` (por campo)
    catchAsync.ts       wrapper de controllers async
    ApiFeatures.ts      filter/sort/limitFields/paginate p/ Drizzle
    schedules.ts        crons (placeholders)
  controllers/userController.ts
  services/userService.ts
  routes/index.ts       monta /api/*
  routes/userRoutes.ts  GET/POST /api/users, GET /api/users/:id
```

## Contrato de erro (compartilhado com o front)

Todo erro devolve o shape definido em `@shared/errors/ApiError`:

```json
{
    "status": 400,
    "error": {
        "message": "Validação falhou",
        "fields": {
            "email": "Email inválido",
            "name": "O nome tem caracteres inválidos"
        }
    }
}
```

O `FormHandler` do front lê `error.fields` pelos mesmos IDs dos inputs (os nomes dos campos batem com a entidade em `@shared/entities/*`).

## API

### `POST /api/users`

Body: `{ name, email, password }` (validado por `@shared/validators/user`). Retorna `PublicUser` (sem `password`). Duplicata de email retorna 409 com `fields.email`.

### `GET /api/users`

Suporta via query string (ver `utils/ApiFeatures.ts`):

- `?campo=valor` — `LIKE` case-insensitive em strings, `=` em números/datas.
- `?campo[gte|gt|lte|lt]=valor` — operadores de comparação.
- `?sort=campo,-outro` — ordenação (prefixo `-` = DESC).
- `?fields=a,b,c` — projeção de colunas.
- `?page=1&limit=10` — paginação.

Resposta: `{ data, page, limit, total }`.

### `GET /api/users/:id`

Retorna `PublicUser` ou 404.

## Como o shared é consumido

- `tsconfig.json` declara `"paths": { "@shared/*": ["../cht-shared/src/*"] }`.
- `tsx` resolve esse alias em runtime (não precisa de build).
- `cht-shared/package.json` tem `"type": "module"` para que os `.ts` sejam tratados como ESM (caso contrário os named exports seriam perdidos na interop CJS).

## Próximos passos (fora deste MVP)

- Autenticação (JWT + `authController` + middleware `protect`/`restrict`).
- Mais entidades do domínio Mecarvit (funcionários, pontos, horas).
- Testes automatizados.
