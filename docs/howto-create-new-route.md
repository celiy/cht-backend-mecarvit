# How to create a new route

This guide explains how to add a new route module safely and consistently.

Use it when you are adding endpoints to an existing entity or introducing a brand-new route group.

## Route architecture in this backend

- `src/app.ts` mounts all API routes under `/api`:
  - `app.use("/api", apiRouter)`
- `src/routes/index.ts` is the route aggregator.
- Each entity or feature should have its own route module in `src/routes/*Routes.ts`.
- Route handlers should live in controllers, not directly in route files.

## Standard pattern

1. Route file imports `Router`.
2. Route file imports controller functions.
3. Route file declares and exports a router.
4. Route file defines `.route("/")` and `.route("/:id")` blocks.
5. `src/routes/index.ts` mounts that router under a base path.

## Step-by-step

### 1) Create a route module

Example file: `src/routes/customerRoutes.ts`

```ts
import { Router } from "express";
import * as customerController from "../controllers/customerController.js";

export const customerRouter = Router();

customerRouter.route("/")
    .get(customerController.listCustomers)
    .post(customerController.createCustomer);

customerRouter.route("/:id")
    .get(customerController.getCustomerById)
    .patch(customerController.updateCustomerById)
    .delete(customerController.deleteCustomerById);
```

### 2) Mount it in `src/routes/index.ts`

```ts
import { customerRouter } from "./customerRoutes.js";

apiRouter.use("/customers", customerRouter);
```

Final URLs become:

- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PATCH /api/customers/:id`
- `DELETE /api/customers/:id`

### 3) Ensure controller handlers exist

Every route handler should:

- use `catchAsync`
- validate inputs
- throw `AppError` for expected errors
- call services for business/data logic

Do not place business rules inside route files.

### 4) Validate params and query

For `:id` style routes, validate the param at controller level:

```ts
const id = Number(req.params.id);

if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("ID inválido", 400, { id: "ID deve ser um inteiro positivo" });
}
```

For list routes, use `ApiFeatures` when needed:

- `filter()`
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

- `userRoutes.ts`
- `customerRoutes.ts`
- `timecardRoutes.ts`

Avoid large mixed route files with unrelated responsibilities.

## Middleware behavior you already get

All routes mounted under `/api` automatically receive:

- security headers (`helmet`)
- hpp protection
- CORS policy
- body parsing with size limits
- request timestamp (`requestContext`)
- input sanitization (`sanitize`)
- fallback 404 (`notFound`)
- global error serialization (`globalErrorHandler`)

So you only add route/controller/service logic.

## Route change checklist

When adding or changing routes:

1. Route file created or updated in `src/routes`.
2. Route mounted in `src/routes/index.ts`.
3. Matching controller methods implemented.
4. Matching service methods implemented.
5. Shared validators/types updated if payload changed.
6. Typecheck passed (`npm run typecheck`).
7. Manual endpoint tests passed.

## Testing examples

After adding routes, run:

```bash
npm run dev
```

Then test with `curl`, for example:

```bash
curl -X GET http://127.0.0.1:8000/api/customers
curl -X POST http://127.0.0.1:8000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme","email":"acme@example.com"}'
```

Also test invalid cases:

- missing required field
- invalid `:id`
- duplicate unique field
- unknown route (`/api/some-missing-route`)

## Common mistakes to avoid

- Defining route handlers inline in route modules.
- Forgetting `.js` extension in ESM imports between local files.
- Forgetting to mount the new router in `src/routes/index.ts`.
- Returning inconsistent JSON shape across routes.
- Skipping shared validators and duplicating ad-hoc checks.

