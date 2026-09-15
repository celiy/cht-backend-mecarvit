import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { openCompany } from "../src/config/database.js";
import { MOCK_COMPANY_NAME, MOCK_LOGIN } from "../src/db/mock/constants.js";
import { clearAllMockData } from "../src/db/mock/clear.js";
import { populateMock } from "../src/db/mock/seed.js";
import { clientes, empresas, usuarios } from "../src/db/schema/index.js";
import { cadastrarOficina, SENHA } from "./helpers.js";

const app = createApp();

describe("dados mock", () => {
    it("popula registros com mock = true e o clear remove só eles", async () => {
        const real = await cadastrarOficina(app, {
            empresaNome: "Oficina Real",
            nome: "Gestor Real",
            email: "gestor.real@oficina.test",
            senha: SENHA
        });

        expect(real.empresaId).toBeTruthy();

        const seeded = await populateMock();
        const mockDb = openCompany(seeded.empresaId);
        const empresaRows = await mockDb.select().from(empresas).limit(1);
        const mockUsers = await mockDb.select().from(usuarios).where(eq(usuarios.mock, true));
        const mockClients = await mockDb.select().from(clientes).where(eq(clientes.mock, true));

        expect(empresaRows[0]?.nome).toBe(MOCK_COMPANY_NAME);
        expect(empresaRows[0]?.mock).toBe(true);
        expect(mockUsers.length).toBeGreaterThan(20);
        expect(mockClients.length).toBeGreaterThan(20);
        expect(mockUsers.every((row) => row.mock)).toBe(true);

        const login = await request(app)
            .post("/api/login")
            .send({
                email: MOCK_LOGIN.email,
                senha: MOCK_LOGIN.senha,
                empresaId: seeded.empresaId
            })
            .expect(200);

        expect(login.body.data.usuario.email).toBe(MOCK_LOGIN.email);
        expect(login.body.data.usuario.nivelAcesso).toContain("0");

        await clearAllMockData();

        const usersAfterClear = await mockDb.select().from(usuarios).where(eq(usuarios.mock, true));
        const clientsAfterClear = await mockDb.select().from(clientes).where(eq(clientes.mock, true));

        expect(usersAfterClear).toHaveLength(0);
        expect(clientsAfterClear).toHaveLength(0);

        const realDb = openCompany(real.empresaId as number);
        const realUsers = await realDb.select().from(usuarios);

        expect(realUsers.some((row) => row.email === "gestor.real@oficina.test")).toBe(true);
        expect(realUsers.every((row) => row.mock === false)).toBe(true);

        await request(app)
            .post("/api/login")
            .send({ email: "gestor.real@oficina.test", senha: SENHA, empresaId: real.empresaId })
            .expect(200);
    });
});
