import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { SENHA, bearer, cadastrarOficina, uniqueCpf, uniqueEmail } from "./helpers.js";

const app = createApp();

describe("segurança das rotas", () => {
    it("SQL injection em query e body não quebra a API", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;
        const payload = "'; DROP TABLE usuario; --";

        await request(app)
            .get("/api/cliente")
            .query({ nome: payload })
            .set(bearer(token))
            .expect(200);

        const invalidName = await request(app)
            .post("/api/cadastro")
            .send({
                empresa: { nome: "Oficina Injection" },
                usuario: {
                    cpf: uniqueCpf(),
                    nome: payload,
                    email: uniqueEmail("sqli"),
                    senha: SENHA
                }
            })
            .expect(400);

        expect(invalidName.body.error.fields["usuario.nome"]).toBeTruthy();

        await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({
                documento: uniqueCpf(),
                nome: payload
            })
            .expect(201);
    });

    it("401 sem token e 403 sem permissão", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;

        await request(app).get("/api/cliente").expect(401);
        await request(app).get("/api/cliente").set(bearer("token.falso")).expect(401);

        const cargo = await request(app)
            .post("/api/cargo")
            .set(bearer(token))
            .send({ nome: "So os", nivelAcesso: "4" })
            .expect(201);

        const func = await request(app)
            .post("/api/usuario")
            .set(bearer(token))
            .send({
                cpf: uniqueCpf(),
                nome: "Mecanico Sem Cliente",
                email: uniqueEmail("mec"),
                senha: SENHA,
                cargoId: cargo.body.data.id
            })
            .expect(201);

        await request(app)
            .post(`/api/usuario/${func.body.data.cpf}/senha`)
            .set(bearer(token))
            .send({ senhaAtual: SENHA, senhaNova: "TrocaSenha9" })
            .expect(200);

        const login = await request(app)
            .post("/api/login")
            .send({
                email: func.body.data.email,
                senha: "TrocaSenha9",
                empresaId: oficina.empresaId
            })
            .expect(200);

        await request(app)
            .get("/api/cliente")
            .set(bearer(login.body.data.token))
            .expect(403);
    });

    it("não expõe ficheiros SQLite em /data", async () => {
        const probeRel = path.join("empresas", "cht-static-probe.sqlite");
        const probeAbs = path.resolve("data", probeRel);

        fs.mkdirSync(path.dirname(probeAbs), { recursive: true });
        fs.writeFileSync(probeAbs, Buffer.from("SQLite format 3\0probe"));

        try {
            await request(app).get(`/data/${probeRel.replaceAll("\\", "/")}`).expect(404);
        } finally {
            fs.rmSync(probeAbs, { force: true });
        }
    });
});
