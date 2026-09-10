# How to create a new route

This guide explains how to add a new route module safely and consistently.

Use it when you are adding endpoints to an existing entity or introducing a brand-new route group.

## Route architecture in this backend

- `src/app.ts` mounts all API routes under `/api`:
  - `app.use("/api", apiRouter)`
- `/health` stays on the app root (Electron).
- `src/routes/index.ts` is the route aggregator.
  - Public: `POST /api/cadastro`, `POST /api/login`, `GET /api/empresa-locais`.
  - Everything else is mounted on a private router with `protect` + `requirePasswordChanged`.
- Each entity or feature should have its own route module in `src/routes/*Routes.ts`.
- Resource paths are Portuguese: `/api/usuario/:cpf`, `/api/cliente/:documento`, `/api/ordem-servico/:id`.
- Route handlers should live in controllers, not directly in route files.

JSON is Portuguese (`cpf`, `nome`, `senha`, `documento`, `criadoEm`). PUT replaces sent nested arrays; PATCH is partial (pagamentos on OS append unless PUT).

## Standard pattern

1. Route file imports `Router`.
2. Route file imports controller functions and, when needed, `requireAccess`.
3. Route file declares and exports a router.
4. Route file defines `.route("/")` and `.route("/:id")` (or `/:cpf`, `/:documento`) blocks.
5. `src/routes/index.ts` mounts that router under a Portuguese base path on the private router.

## Step-by-step

### 1) Create a route module

Example file: `src/routes/clienteRoutes.ts`

```ts
import { Router } from "express";
import * as clienteController from "../controllers/clienteController.js";
import { requireAccess } from "../middlewares/requireAccess.js";
import { ACCESS } from "../db/schema/tables.js";

export const clienteRouter = Router();

clienteRouter.use(requireAccess(ACCESS.CLIENTES));

clienteRouter.route("/")
    .get(clienteController.listClientes)
    .post(clienteController.createCliente);

clienteRouter.route("/:documento")
    .get(clienteController.getCliente)
    .put(clienteController.updateCliente)
    .patch(clienteController.updateCliente)
    .delete(clienteController.deleteCliente);
```

### 2) Mount it in `src/routes/index.ts`

```ts
privateRouter.use("/cliente", clienteRouter);
```

Final URLs become:

- `GET /api/cliente`
- `POST /api/cliente`
- `GET /api/cliente/:documento`
- `PUT /api/cliente/:documento`
- `PATCH /api/cliente/:documento`
- `DELETE /api/cliente/:documento`

### 3) Ensure controller handlers exist

Every route handler should:

- use `catchAsync`
- validate inputs
- throw `AppError` for expected errors
- call services for business/data logic (`db` comes from `req.db` via `protect`)

Do not place business rules inside route files.

### 4) Validate params and query

For `:id` style routes, use `parseId`. For CPF/documento, persist digits only (`digitsOnly`).

For list routes, use `ApiFeatures` when needed:

- `filter()` (`?nome=`, `?ativo=`)
- `sort()`
- `limitFields()`
- `paginate()`

### 5) Keep response shape consistent

Success responses should follow the existing style:

- single resource: `{ data: item }`
- list resource: `{ data: items, page, limit, total }`

Errors should always come from global error middleware in `ApiErrorResponse` format.

## Recommended route grouping

Prefer one route module per domain area or entity.

Examples:

- `usuarioRoutes.ts`
- `clienteRoutes.ts`
- `ordemServicoRoutes.ts`

Avoid large mixed route files with unrelated responsibilities.

## Middleware behavior you already get

All routes mounted under `/api` automatically receive:

- security headers (`helmet`)
- hpp protection
- CORS policy
- body parsing with size limits (`1mb`)
- request timestamp (`requestContext`)
- input sanitization (`sanitize`)
- fallback 404 (`notFound`)
- global error serialization (`globalErrorHandler`)

Private routes also open the company SQLite from the JWT (`protect`).

## Route change checklist

When adding or changing routes:

1. Route file created or updated in `src/routes`.
2. Route mounted in `src/routes/index.ts` (public vs private).
3. Matching controller methods implemented.
4. Matching service methods implemented.
5. Shared validators/types updated if payload changed.
6. Typecheck passed (`npm run typecheck`).
7. `npm run tests` passed.
8. Optional: REPL `document-routes` to refresh `docs/routes/*.md`.

## Testing examples

After adding routes, run:

```bash
npm run tests
npm run dev
```

Then test with `curl`, for example:

```bash
curl -X POST http://127.0.0.1:8000/api/cadastro \
  -H "Content-Type: application/json" \
  -d '{"empresa":{"nome":"Oficina"},"usuario":{"cpf":"390.533.447-05","nome":"Ana Gestora","email":"ana@oficina.test","senha":"SenhaForte1"}}'
```

Also test invalid cases:

- missing required field
- invalid CPF/CNPJ
- duplicate unique field (`409`)
- unknown route (`/api/some-missing-route`)

## Common mistakes to avoid

- Defining route handlers inline in route modules.
- Forgetting `.js` extension in ESM imports between local files.
- Forgetting to mount the new router in `src/routes/index.ts`.
- Mounting a private resource without `protect`.
- Returning inconsistent JSON shape across routes.
- Skipping shared validators and duplicating ad-hoc checks.
