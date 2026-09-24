import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
    SENHA,
    bearer,
    cadastrarOficina,
    uniqueCpf,
    uniqueEmail
} from "./helpers.js";

const app = createApp();

describe("health e cadastro/login", () => {
    it("GET /health retorna ok", async () => {
        const response = await request(app).get("/health").expect(200);

        expect(response.body.status).toBe("ok");
        expect(typeof response.body.at).toBe("string");
    });

    it("cadastra empresa e gestor, lista locais e faz login sem empresaId", async () => {
        const created = await cadastrarOficina(app);

        expect(created.response.status).toBe(201);
        expect(created.token).toBeTruthy();
        expect(created.response.body.data.precisaTrocarSenha).toBe(false);
        expect(created.response.body.data.usuario.nivelAcesso).toContain("superadmin");

        const locais = await request(app).get("/api/empresa-locais").expect(200);
        const ids = (locais.body.data as Array<{ id: number }>).map((item) => item.id);

        expect(ids).toContain(created.empresaId);

        const login = await request(app)
            .post("/api/login")
            .send({ email: created.email, senha: SENHA })
            .expect(200);

        expect(login.body.data.token).toBeTruthy();
        expect(login.body.data.empresa.id).toBe(created.empresaId);
        expect(login.body.data.precisaTrocarSenha).toBe(false);
    });

    it("rejeita cadastro com campos vazios, overflow e nome com números", async () => {
        await request(app).post("/api/cadastro").send({}).expect(400);
        await request(app)
            .post("/api/cadastro")
            .send({
                empresa: { nome: "A".repeat(500) },
                usuario: {
                    cpf: uniqueCpf(),
                    nome: "Ana Gestora",
                    email: uniqueEmail("overflow"),
                    senha: SENHA
                }
            })
            .expect(400);
        await request(app)
            .post("/api/cadastro")
            .send({
                empresa: { nome: "Oficina" },
                usuario: {
                    cpf: uniqueCpf(),
                    nome: "Ana 2",
                    email: uniqueEmail("num"),
                    senha: SENHA
                }
            })
            .expect(400);
        await request(app)
            .post("/api/cadastro")
            .send({
                empresa: { nome: "Oficina" },
                usuario: {
                    cpf: "123",
                    nome: "Ana Gestora",
                    email: uniqueEmail("cpf"),
                    senha: SENHA
                }
            })
            .expect(400);
    });

    it("rejeita login inválido e pede empresaId quando o email é ambíguo", async () => {
        await request(app)
            .post("/api/login")
            .send({ email: "naoexiste@oficina.test", senha: SENHA })
            .expect(401);

        const email = uniqueEmail("dup");
        const first = await cadastrarOficina(app, { email });
        const second = await cadastrarOficina(app, { email });

        expect(first.response.status).toBe(201);
        expect(second.response.status).toBe(201);

        const ambiguous = await request(app)
            .post("/api/login")
            .send({ email, senha: SENHA })
            .expect(400);

        expect(ambiguous.body.error.fields.empresaId).toBeTruthy();
        expect(ambiguous.body.error.empresas).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: first.empresaId }),
                expect.objectContaining({ id: second.empresaId })
            ])
        );

        await request(app)
            .post("/api/login")
            .send({ email, senha: SENHA, empresaId: second.empresaId })
            .expect(200);
    });

    it("funcionário único faz login sem empresaId", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;
        const cargo = await request(app)
            .post("/api/cargo")
            .set(bearer(token))
            .send({ nome: "Atendente", nivelAcesso: "2" })
            .expect(201);
        const func = await request(app)
            .post("/api/usuario")
            .set(bearer(token))
            .send({
                cpf: uniqueCpf(),
                nome: "Bruno Funcionario",
                email: uniqueEmail("loginfunc"),
                senha: SENHA,
                cargoId: cargo.body.data.id
            })
            .expect(201);

        const loginWithoutEmpresa = await request(app)
            .post("/api/login")
            .send({ email: func.body.data.email, senha: SENHA })
            .expect(200);

        expect(loginWithoutEmpresa.body.data.empresa.id).toBe(oficina.empresaId);

        const login = await request(app)
            .post("/api/login")
            .send({
                email: func.body.data.email,
                senha: SENHA,
                empresaId: oficina.empresaId
            })
            .expect(200);

        expect(login.body.data.precisaTrocarSenha).toBe(true);
    });
});
