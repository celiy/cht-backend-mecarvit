# How to create a new entity

This guide explains the full flow to add a new entity in this backend.

It covers backend entity types, shared validators/contracts, database schema/migrations, service/controller/route layers, and verification steps.

## Architecture recap

- HTTP entrypoint is `src/app.ts`.
- API routes are mounted under `/api` in `src/routes/index.ts`. Resource paths are in Portuguese (`/api/usuario`, `/api/cliente`, `/api/ordem-servico`).
- Persistence is **one SQLite file per company** in `EMPRESAS_DIR` (`data/empresas/{id}.sqlite`). `src/config/database.ts` keeps a pool (`openCompany`, `createCompanyDatabase`) and runs Drizzle migrate on first open. The process can boot with zero files until `POST /api/cadastro`.
- JSON payloads use Portuguese field names (`cpf`, `nome`, `senha`, `documento`, `criadoEm`).
- Shared validators/contracts are imported from `@shared/*` (`../cht-shared/src/*` via `tsconfig.json` paths). Mecarvit validators live in `cht-shared/src/validators/mecarvit.ts`.
- Backend domain entities live locally in `src/entities/*`.
- Errors must use `AppError` and are formatted by `globalErrorHandler` into `ApiErrorResponse`.
- `criadoEm` / `modificadoEm` come from `timestamps()` in `src/db/schema/timestamps.ts`. Do not set them in controllers.

## Naming conventions

Use Portuguese resource names in HTTP and English identifiers in code:

- Entity name in code: `Cliente`.
- Table variable: `clientes` (SQLite table `cliente`).
- Files:
  - `src/db/schema/tables.ts` (or a dedicated schema file exported from `src/db/schema/index.ts`)
  - `src/services/clienteService.ts`
  - `src/controllers/clienteController.ts`
  - `src/routes/clienteRoutes.ts`

## Step 1: Add backend entity contracts in `src/entities`

Create entity types in the backend first. Domain entities now belong to this repository.

1. Add entity types in `src/entities/Cliente.ts` when the public shape is richer than the table row.
2. Reuse these types in services/controllers as needed.
3. Keep only truly shared contracts in `cht-shared`.

## Step 2: Add/update shared validator (if needed)

If frontend and backend should share validation behavior, add/update:

- `cht-shared/src/validators/mecarvit.ts` (preferred for this product)
- or a dedicated `cht-shared/src/validators/*.ts`

Validation functions should return field-level errors compatible with `ApiErrorFields`.

Person names (`Usuario.nome`) use `validateName`. Client document uses `validateDocumento` (CPF or CNPJ).

## Step 3: Create Drizzle schema

Add the table next to the other núcleo tables in `src/db/schema/tables.ts` (or a new file re-exported from `index.ts`).

Use `timestamps()` for `criadoEm` / `modificadoEm`. Foreign keys must be explicit. Do not add RH/ponto tables.

Then export it in `src/db/schema/index.ts` if it is a new file.

## Step 4: Generate and apply migration

Run from `cht-backend-mecarvit`:

```bash
npm run db:generate
```

Migrations live in `src/db/migrations/` and are applied automatically when a company file is opened. `npm run db:migrate` opens every existing `{id}.sqlite` under `EMPRESAS_DIR` and applies pending migrations. There is no single `DB_PATH` database anymore.

## Step 5: Implement service layer

Create `src/services/clienteService.ts`.

Rules:

- Service only handles business logic and database operations.
- Do not access `req`/`res` in services. Receive `db: AppDatabase` as the first argument.
- Use `openCompany` / `requireDb` at the HTTP boundary, not inside the service.
- Return sanitized/public objects, not raw private fields (never return `senha`).

## Step 6: Implement controller layer

Create `src/controllers/clienteController.ts`.

Rules:

- Wrap async handlers with `catchAsync`.
- Validate request payload with `@shared/validators/*`.
- Throw `new AppError(message, statusCode, fields?)` for expected failures.
- Keep controllers thin and delegate business logic to service.

If listing supports query params, reuse `ApiFeatures`:

```ts
const features = new ApiFeatures(db, clientes, req.query as Record<string, unknown>)
    .filter()
    .sort()
    .limitFields()
    .paginate();
```

Default list filter for `ativo` (when omitted) is handled by `defaultAtivoQuery`.

## Step 7: Add route file

Create `src/routes/clienteRoutes.ts` and mount it from `src/routes/index.ts` **after** `protect` / `requirePasswordChanged`. Use `requireAccess("2"|"3"|"4"|"5")` when the resource is permission-gated. Superadmin (`nivelAcesso` containing `0`) bypasses those checks.

This exposes endpoints under `/api/cliente`.

## Step 8: Error handling checklist

For every new entity, confirm:

- Validation errors return `400` + `error.fields`.
- Duplicate unique values return `409` through `globalErrorHandler` mapping.
- Missing records return `404`.
- Operational conflicts (delete with history, cancel OS with payments) return `409`.
- Unknown errors flow to `globalErrorHandler` and keep `ApiErrorResponse` shape.

## Step 9: Security and middleware expectations

You do not need to manually call sanitize/cors/helmet for each route.

They are already configured globally in `src/app.ts`:

- `helmet`
- `cookieParser`
- JSON body limit (`1mb`)
- `hpp`
- `cors`
- `requestContext`
- `sanitize`

Authenticated routes also get `protect` (opens the company SQLite from the JWT `empresaId`) and `requirePasswordChanged`.

## Step 10: Verification checklist

After implementation:

1. Run typecheck:

```bash
npm run typecheck
```

2. Generate migrations if schema changed:

```bash
npm run db:generate
```

3. Run tests:

```bash
npm run tests
```

4. Start server:

```bash
npm run dev
```

In development, the stdin REPL accepts `document-routes` and `run-tests`.

## Common mistakes to avoid

- Forgetting to export the new schema in `src/db/schema/index.ts`.
- Assuming a process-wide singleton database. Always pass the company `db`.
- Returning private fields from service/controller.
- Throwing plain `Error` for expected API failures instead of `AppError`.
- Using English resource paths (`/users`) instead of Portuguese (`/usuario`).
- Forgetting to mount the route on the private router in `src/routes/index.ts`.
