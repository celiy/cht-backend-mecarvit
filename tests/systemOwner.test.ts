import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import bcrypt from "bcrypt";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { consumeInstallerOwnerSetup } from "../src/config/systemOwnerEnv.js";
import { cadastrarOficina, SENHA, uniqueCpf, uniqueEmail } from "./helpers.js";

const app = createApp();
const OWNER_PASSWORD = "DonoSenha1";

function clearOwnerEnv() {
    delete process.env.SYSTEM_OWNER_LOGIN;
    delete process.env.SYSTEM_OWNER_PASSWORD_HASH;
}

describe("dono do sistema", () => {
    beforeEach(() => {
        clearOwnerEnv();
    });

    afterEach(() => {
        clearOwnerEnv();
    });

    it("não exige token quando o dono não foi configurado", async () => {
        const status = await request(app).get("/api/system/status").expect(200);

        expect(status.body.data.configured).toBe(false);
        expect(status.body.data.required).toBe(false);

        const oficina = await cadastrarOficina(app);

        expect(oficina.response.status).toBe(201);
    });

    it("bloqueia cadastro, login e listagem local até o dono autenticar", async () => {
        process.env.SYSTEM_OWNER_LOGIN = "dono.local";
        process.env.SYSTEM_OWNER_PASSWORD_HASH = await bcrypt.hash(OWNER_PASSWORD, 4);

        const status = await request(app).get("/api/system/status").expect(200);

        expect(status.body.data.configured).toBe(true);
        expect(status.body.data.required).toBe(true);

        await request(app)
            .post("/api/cadastro")
            .send({
                empresa: { nome: "Oficina Bloqueada" },
                usuario: {
                    cpf: uniqueCpf(),
                    nome: "Ana Gestora",
                    email: uniqueEmail("bloqueada"),
                    senha: SENHA
                }
            })
            .expect(403);

        await request(app)
            .post("/api/login")
            .send({ email: "gestor@oficina.test", senha: SENHA })
            .expect(403);

        await request(app).get("/api/empresa-locais").expect(403);

        await request(app)
            .post("/api/system/login")
            .send({ login: "dono.local", senha: "senha-errada" })
            .expect(401);

        const unlocked = await request(app)
            .post("/api/system/login")
            .send({ login: "dono.local", senha: OWNER_PASSWORD })
            .expect(200);

        const systemToken = unlocked.body.data.token as string;

        expect(systemToken).toBeTruthy();

        const oficina = await request(app)
            .post("/api/cadastro")
            .set("X-Cht-System-Token", systemToken)
            .send({
                empresa: { nome: "Oficina Liberada" },
                usuario: {
                    cpf: uniqueCpf(),
                    nome: "Ana Gestora",
                    email: uniqueEmail("liberada"),
                    senha: SENHA
                }
            })
            .expect(201);

        expect(oficina.body.data.token).toBeTruthy();
    });

    it("grava o hash no .env a partir do arquivo do instalador e apaga a senha em texto", async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cht-owner-"));
        const setupPath = path.join(dir, "system-owner.setup");
        const envPath = path.join(dir, ".env");

        fs.writeFileSync(setupPath, "login=instalador\npassword=SenhaInst1\n");

        const previous = {
            SYSTEM_ENV_PATH: process.env.SYSTEM_ENV_PATH,
            SYSTEM_OWNER_SETUP_PATH: process.env.SYSTEM_OWNER_SETUP_PATH,
            BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS
        };

        process.env.SYSTEM_ENV_PATH = envPath;
        process.env.SYSTEM_OWNER_SETUP_PATH = setupPath;
        process.env.BCRYPT_ROUNDS = "4";

        try {
            consumeInstallerOwnerSetup();

            expect(process.env.SYSTEM_OWNER_LOGIN).toBe("instalador");
            expect(process.env.SYSTEM_OWNER_PASSWORD_HASH).toMatch(/^\$2[aby]\$/);
            expect(fs.existsSync(setupPath)).toBe(false);

            const envText = fs.readFileSync(envPath, "utf8");

            expect(envText).toContain("SYSTEM_OWNER_LOGIN=instalador");
            expect(envText).toContain("SYSTEM_OWNER_PASSWORD_HASH=");
            expect(envText).not.toContain("SenhaInst1");
        } finally {
            process.env.SYSTEM_ENV_PATH = previous.SYSTEM_ENV_PATH;
            process.env.SYSTEM_OWNER_SETUP_PATH = previous.SYSTEM_OWNER_SETUP_PATH;
            process.env.BCRYPT_ROUNDS = previous.BCRYPT_ROUNDS;
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});
