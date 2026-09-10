import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
    SENHA,
    SENHA_NOVA,
    bearer,
    cadastrarOficina,
    criarCargo,
    criarFuncionario,
    uniqueCpf,
    uniqueEmail
} from "./helpers.js";

const app = createApp();

describe("usuario, cargo e senha inicial", () => {
    it("gestor lista usuários, cria funcionário e bloqueia DELETE", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;

        await request(app).get("/api/usuario").expect(401);

        const list = await request(app).get("/api/usuario").set(bearer(token)).expect(200);
        expect(list.body.total).toBeGreaterThanOrEqual(1);

        const cargo = await criarCargo(app, token, "5", "RH interno");
        const func = await criarFuncionario(app, token, cargo.id);

        await request(app)
            .post("/api/usuario")
            .set(bearer(token))
            .send({
                cpf: func.cpf,
                nome: "Carlos Duplicado",
                email: uniqueEmail("dupuser"),
                senha: SENHA,
                cargoId: cargo.id
            })
            .expect(409);

        await request(app)
            .delete(`/api/usuario/${oficina.cpf}`)
            .set(bearer(token))
            .expect(404);

        const inativar = await request(app)
            .patch(`/api/usuario/${oficina.cpf}`)
            .set(bearer(token))
            .send({ ativo: false })
            .expect(409);

        expect(inativar.body.error.fields.ativo).toBeTruthy();
    });

    it("nivelAcesso 0 é exclusivo do fundador", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;

        await request(app)
            .post("/api/cargo")
            .set(bearer(token))
            .send({ nome: "Outro super", nivelAcesso: "0" })
            .expect(400);

        const cargo = await criarCargo(app, token, "5", "Chefe");

        await request(app)
            .post("/api/usuario")
            .set(bearer(token))
            .send({
                cpf: uniqueCpf(),
                nome: "Falso Gestor",
                email: uniqueEmail("fake"),
                senha: SENHA,
                cargoId: 1
            })
            .expect(400);

        await request(app)
            .patch(`/api/usuario/${oficina.cpf}`)
            .set(bearer(token))
            .send({ cargoId: cargo.id })
            .expect(409);

        await request(app)
            .delete(`/api/cargo/1`)
            .set(bearer(token))
            .expect(409);
    });

    it("primeiro acesso exige troca de senha antes de writes", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;
        const cargo = await criarCargo(app, token, "2", "Atendente");
        const func = await criarFuncionario(app, token, cargo.id);
        const login = await request(app)
            .post("/api/login")
            .send({ email: func.email, senha: SENHA, empresaId: oficina.empresaId })
            .expect(200);

        expect(login.body.data.precisaTrocarSenha).toBe(true);

        const funcToken = login.body.data.token as string;

        await request(app)
            .post("/api/cliente")
            .set(bearer(funcToken))
            .send({ documento: uniqueCpf(), nome: "Cliente Bloqueado" })
            .expect(403);

        await request(app)
            .post(`/api/usuario/${func.cpf}/senha`)
            .set(bearer(funcToken))
            .send({ senhaAtual: SENHA, senhaNova: SENHA_NOVA })
            .expect(200);

        const login2 = await request(app)
            .post("/api/login")
            .send({ email: func.email, senha: SENHA_NOVA, empresaId: oficina.empresaId })
            .expect(200);

        expect(login2.body.data.precisaTrocarSenha).toBe(false);

        await request(app)
            .post("/api/cliente")
            .set(bearer(login2.body.data.token))
            .send({ documento: uniqueCpf(), nome: "Cliente Liberado" })
            .expect(201);
    });

    it("funcionário sem acesso 5 recebe 403 em gestão de usuários", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;
        const cargo = await criarCargo(app, token, "2", "So cliente");
        const func = await criarFuncionario(app, token, cargo.id);

        await request(app)
            .post(`/api/usuario/${func.cpf}/senha`)
            .set(bearer(token))
            .send({ senhaAtual: SENHA, senhaNova: SENHA_NOVA })
            .expect(200);

        const login = await request(app)
            .post("/api/login")
            .send({ email: func.email, senha: SENHA_NOVA, empresaId: oficina.empresaId })
            .expect(200);

        await request(app)
            .get("/api/usuario")
            .set(bearer(login.body.data.token))
            .expect(403);
    });
});
