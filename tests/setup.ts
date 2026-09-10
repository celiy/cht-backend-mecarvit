import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll } from "vitest";

const empresasDir = fs.mkdtempSync(path.join(os.tmpdir(), "mecarvit-empresas-"));

process.env.NODE_ENV = "test";
process.env.EMPRESAS_DIR = empresasDir;
process.env.JWT_SECRET = "test-secret-please";
process.env.BCRYPT_ROUNDS = "4";
process.env.HOST = "127.0.0.1";
process.env.PORT = "8000";

afterAll(async () => {
    const { closeAllCompanies } = await import("../src/config/database.js");

    closeAllCompanies();
    fs.rmSync(empresasDir, { recursive: true, force: true });
});
