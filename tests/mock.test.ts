import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { empresaExists, openCompany } from "../src/config/database.js";
import {
    MOCK_COMPANY_NAME,
    MOCK_COMPANY_NAMES,
    MOCK_LOGIN,
    MOCK_SHARED_STAFF,
    MOCK_STAFF_PASSWORD
} from "../src/db/mock/constants.js";
import { clearAllMockData } from "../src/db/mock/clear.js";
import { populateMock } from "../src/db/mock/seed.js";
import { resetMockData } from "../src/db/reset.js";
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
        expect(login.body.data.usuario.nivelAcesso).toContain("superadmin");

        expect(seeded.empresas).toHaveLength(MOCK_COMPANY_NAMES.length);
        expect(seeded.empresas.map((item) => item.nome).sort()).toEqual([...MOCK_COMPANY_NAMES].sort());

        const sharedStaff = MOCK_SHARED_STAFF[0];

        expect(sharedStaff).toBeTruthy();

        for (const company of seeded.empresas) {
            const companyDb = openCompany(company.empresaId);
            const empresa = (await companyDb.select().from(empresas).limit(1))[0];
            const superadmin = await companyDb
                .select()
                .from(usuarios)
                .where(eq(usuarios.email, MOCK_LOGIN.email));
            const shared = await companyDb
                .select()
                .from(usuarios)
                .where(eq(usuarios.email, sharedStaff!.email));

            expect(empresa?.mock).toBe(true);
            expect(superadmin[0]?.cpf).toBe(MOCK_LOGIN.cpf);
            expect(shared[0]?.cpf).toBe(sharedStaff!.cpf);
        }

        const selectLogin = await request(app)
            .post("/api/login")
            .send({
                email: MOCK_LOGIN.email,
                senha: MOCK_LOGIN.senha
            })
            .expect(400);

        expect(selectLogin.body.error.empresas).toHaveLength(MOCK_COMPANY_NAMES.length);

        const sharedSelect = await request(app)
            .post("/api/login")
            .send({
                email: sharedStaff!.email,
                senha: MOCK_STAFF_PASSWORD
            })
            .expect(400);

        expect(sharedSelect.body.error.empresas).toHaveLength(MOCK_COMPANY_NAMES.length);

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

    it("db:reset remove a oficina mock e preserva a oficina real", async () => {
        const real = await cadastrarOficina(app, {
            empresaNome: "Oficina do Gestor",
            nome: "Gestor Preservado",
            email: "gestor.preservado@oficina.test",
            senha: SENHA
        });
        const seeded = await populateMock();

        const result = await resetMockData();

        expect(result.removedCompanyIds).toContain(seeded.empresaId);

        for (const company of seeded.empresas) {
            expect(result.removedCompanyIds).toContain(company.empresaId);
            expect(empresaExists(company.empresaId)).toBe(false);
        }

        expect(empresaExists(real.empresaId as number)).toBe(true);

        await request(app)
            .post("/api/login")
            .send({
                email: "gestor.preservado@oficina.test",
                senha: SENHA,
                empresaId: real.empresaId
            })
            .expect(200);

        await request(app)
            .post("/api/login")
            .send({
                email: MOCK_LOGIN.email,
                senha: MOCK_LOGIN.senha,
                empresaId: seeded.empresaId
            })
            .expect(404);
    });
});
