import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

const dbPath = process.env.DB_PATH ?? './data/mecarvit.sqlite';

export default defineConfig({
    schema: './src/db/schema/index.ts',
    out: './src/db/migrations',
    dialect: 'sqlite',
    dbCredentials: {
        url: dbPath,
    },
    verbose: true,
    strict: true,
});
