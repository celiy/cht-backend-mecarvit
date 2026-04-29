# How to create a new entity

This guide explains the full flow to add a new entity in this backend.

It covers backend entity types, shared validators/contracts, database schema/migrations, service/controller/route layers, and verification steps.

## Architecture recap

- HTTP entrypoint is `src/app.ts`.
- API routes are mounted under `/api` in `src/routes/index.ts`.
- Database access is done through Drizzle + SQLite in `src/config/database.ts`.
- Shared validators/contracts are imported from `@shared/*` (`../cht-shared/src/*` via `tsconfig.json` paths).
- Backend domain entities live locally in `src/entities/*`.
- Errors must use `AppError` and are formatted by `globalErrorHandler` into `ApiErrorResponse`.

## Naming conventions

Use the same naming pattern already used by `User`:

- Entity name in code: `Customer`.
- Table variable: `customers`.
- Files:
  - `src/db/schema/customers.ts`
  - `src/services/customerService.ts`
  - `src/controllers/customerController.ts`
  - `src/routes/customerRoutes.ts`

## Step 1: Add backend entity contracts in `src/entities`

Create entity types in the backend first. Domain entities now belong to this repository.

1. Add entity types in `src/entities/Customer.ts`.
2. Reuse these types in services/controllers as needed.
3. Keep only truly shared contracts in `cht-shared`.

Example:

```ts
export interface Customer {
    id: number;
    name: string;
    email: string;
    createdAt: Date;
}

export type PublicCustomer = Customer;

export interface CreateCustomerDTO {
    name: string;
    email: string;
}
```

## Step 2: Add/update shared validator (if needed)

If frontend and backend should share validation behavior, add/update:

- `cht-shared/src/validators/customer.ts`

Validation functions should return field-level errors compatible with `ApiErrorFields`.

## Step 3: Create Drizzle schema

Create `src/db/schema/customers.ts`.

Example:

```ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const customers = sqliteTable("customers", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .$defaultFn(() => new Date()),
});

export type CustomerRow = typeof customers.$inferSelect;
export type NewCustomerRow = typeof customers.$inferInsert;
```

Then export it in `src/db/schema/index.ts`:

```ts
export * from "./users";
export * from "./customers";
```

## Step 4: Generate and apply migration

Run from `cht-backend-mecarvit`:

```bash
npm run db:generate
npm run db:migrate
```

This generates SQL files in `src/db/migrations/` and applies them to `DB_PATH`.

## Step 5: Implement service layer

Create `src/services/customerService.ts`.

Rules:

- Service only handles business logic and database operations.
- Do not access `req`/`res` in services.
- Use `getDatabase()` from `src/config/database.ts`.
- Return sanitized/public objects, not raw private fields.

Typical functions:

- `createCustomer(dto)`
- `findCustomerById(id)`
- `findCustomerByEmail(email)`
- `updateCustomer(id, dto)`
- `deleteCustomer(id)`

## Step 6: Implement controller layer

Create `src/controllers/customerController.ts`.

Rules:

- Wrap async handlers with `catchAsync`.
- Validate request payload with `@shared/validators/*` (or local validator when it is backend-only behavior).
- Throw `new AppError(message, statusCode, fields?)` for expected failures.
- Keep controllers thin and delegate business logic to service.

Minimal endpoints usually include:

- `createCustomer`
- `listCustomers`
- `getCustomerById`

If listing supports query params, reuse `ApiFeatures`:

```ts
const features = new ApiFeatures(db, customers, req.query as Record<string, unknown>)
    .filter()
    .sort()
    .limitFields()
    .paginate();
```

## Step 7: Add route file

Create `src/routes/customerRoutes.ts`.

Example:

```ts
import { Router } from "express";
import * as customerController from "../controllers/customerController.js";

export const customerRouter = Router();

customerRouter.route("/")
    .get(customerController.listCustomers)
    .post(customerController.createCustomer);

customerRouter.route("/:id")
    .get(customerController.getCustomerById);
```

## Step 8: Mount route in API root

Edit `src/routes/index.ts`:

```ts
import { customerRouter } from "./customerRoutes.js";

apiRouter.use("/customers", customerRouter);
```

This exposes endpoints under `/api/customers`.

## Step 9: Error handling checklist

For every new entity, confirm:

- Validation errors return `400` + `error.fields`.
- Duplicate unique values return `409` through `globalErrorHandler` mapping.
- Missing records return `404`.
- Unknown errors flow to `globalErrorHandler` and keep `ApiErrorResponse` shape.

## Step 10: Security and middleware expectations

You do not need to manually call sanitize/cors/helmet for each route.

They are already configured globally in `src/app.ts`:

- `helmet`
- `cookieParser`
- JSON body limit (`10kb`)
- `hpp`
- `cors`
- `requestContext`
- `sanitize`

## Step 11: Verification checklist

After implementation:

1. Run typecheck:

```bash
npm run typecheck
```

2. Run migrations if schema changed:

```bash
npm run db:generate
npm run db:migrate
```

3. Start server:

```bash
npm run dev
```

4. Test endpoints manually with `curl`/Postman:

- create valid record
- create invalid record
- create duplicate record
- list with filters/sort/pagination
- fetch non-existing id

## Common mistakes to avoid

- Forgetting to export the new schema in `src/db/schema/index.ts`.
- Returning private fields from service/controller.
- Throwing plain `Error` for expected API failures instead of `AppError`.
- Importing entity types from `@shared/entities/*` instead of local `src/entities/*`.
- Forgetting to mount route in `src/routes/index.ts`.
