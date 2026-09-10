import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
    schema: "./src/db/schema/index.ts",
    out: "./src/db/migrations",
    dialect: "sqlite",
    dbCredentials: {
        url: process.env.DB_PATH ?? "./data/empresas/1.sqlite",
    },
    verbose: true,
    strict: true,
});
