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

        // A oficina recém-criada só tem o próprio fundador, e a listagem o
        // exclui de propósito: gerenciar a si mesmo é papel da tela de perfil.
        const empty = await request(app).get("/api/usuario").set(bearer(token)).expect(200);
        expect(empty.body.total).toBe(0);

        const cargo = await criarCargo(app, token, "5", "RH interno");
        const func = await criarFuncionario(app, token, cargo.id);

        const list = await request(app).get("/api/usuario").set(bearer(token)).expect(200);
        expect(list.body.total).toBeGreaterThanOrEqual(1);
        expect(list.body.data.map((item: { cpf: string }) => item.cpf)).toContain(func.cpf);

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

        await request(app).delete(`/api/usuario/${oficina.cpf}`).set(bearer(token)).expect(404);

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

        await request(app).delete(`/api/cargo/1`).set(bearer(token)).expect(409);
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

        await request(app).get("/api/usuario").set(bearer(login.body.data.token)).expect(403);
    });

    it("funcionário sem FUNCIONARIOS edita o próprio perfil, não o dos outros", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;
        const cargo = await criarCargo(app, token, "34", "Mecânico");
        const func = await criarFuncionario(app, token, cargo.id);

        const login = await request(app)
            .post("/api/login")
            .send({ email: func.email, senha: SENHA, empresaId: oficina.empresaId })
            .expect(200);

        await request(app)
            .post(`/api/usuario/${func.cpf}/senha`)
            .set(bearer(login.body.data.token))
            .send({ senhaAtual: SENHA, senhaNova: SENHA_NOVA })
            .expect(200);

        const reLogin = await request(app)
            .post("/api/login")
            .send({ email: func.email, senha: SENHA_NOVA, empresaId: oficina.empresaId })
            .expect(200);
        const authed = reLogin.body.data.token as string;

        // Salvar o próprio perfil é o fluxo da tela de perfil e não exige o dígito.
        const perfil = await request(app)
            .put(`/api/usuario/${func.cpf}`)
            .set(bearer(authed))
            .send({ nome: "Bruno Renomeado" })
            .expect(200);

        expect(perfil.body.data.nome).toBe("Bruno Renomeado");

        // Editar outra pessoa continua exigindo FUNCIONARIOS.
        await request(app)
            .put(`/api/usuario/${oficina.cpf}`)
            .set(bearer(authed))
            .send({ nome: "Nao Deveria" })
            .expect(403);

        // Nem o próprio cargo: a recusa é explícita, não um no-op silencioso.
        await request(app)
            .patch(`/api/usuario/${func.cpf}`)
            .set(bearer(authed))
            .send({ cargoId: cargo.id })
            .expect(409);
    });

    it("lista usuários por CPF em dígitos ou formatado", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;
        const cargo = await criarCargo(app, token, "5", "Filtro CPF");
        const func = await criarFuncionario(app, token, cargo.id);
        const formatted = func.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

        const byDigits = await request(app)
            .get("/api/usuario")
            .query({ cpf: func.cpf })
            .set(bearer(token))
            .expect(200);

        expect(byDigits.body.data.some((row: { cpf: string }) => row.cpf === func.cpf)).toBe(true);

        const byMasked = await request(app)
            .get("/api/usuario")
            .query({ cpf: formatted })
            .set(bearer(token))
            .expect(200);

        expect(byMasked.body.data.some((row: { cpf: string }) => row.cpf === func.cpf)).toBe(true);
    });
});
