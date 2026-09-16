import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
    bearer,
    cadastrarOficina,
    enderecoPadrao,
    uniqueCnpj,
    uniqueCpf
} from "./helpers.js";

const app = createApp();

describe("cliente, veiculo, empresa e cargo", () => {
    it("cria cliente com endereços e veículos, e exclui em cascata sem OS", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;
        const documento = uniqueCpf();

        const created = await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({
                documento,
                nome: "Joao da Silva",
                enderecos: [enderecoPadrao],
                veiculos: [{ modelo: "Gol", placa: "ABC1D23" }]
            })
            .expect(201);

        expect(created.body.data.veiculos).toHaveLength(1);
        expect(created.body.data.enderecos).toHaveLength(1);

        const got = await request(app)
            .get(`/api/cliente/${documento}`)
            .set(bearer(token))
            .expect(200);

        expect(got.body.data.nome).toBe("Joao da Silva");

        await request(app)
            .delete(`/api/cliente/${documento}`)
            .set(bearer(token))
            .expect(204);

        await request(app)
            .get(`/api/cliente/${documento}`)
            .set(bearer(token))
            .expect(404);
    });

    it("compartilha endereço entre clientes e rejeita endereço duplicado", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;
        const documentoA = uniqueCpf();
        const documentoB = uniqueCpf();

        const clienteA = await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({
                documento: documentoA,
                nome: "Cliente A",
                enderecos: [enderecoPadrao]
            })
            .expect(201);

        const enderecoId = clienteA.body.data.enderecos[0].id as number;

        await request(app)
            .post("/api/endereco")
            .set(bearer(token))
            .send(enderecoPadrao)
            .expect(409);

        await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({
                documento: documentoB,
                nome: "Cliente B",
                enderecoIds: [enderecoId]
            })
            .expect(201);

        const clienteB = await request(app)
            .get(`/api/cliente/${documentoB}`)
            .set(bearer(token))
            .expect(200);

        expect(clienteB.body.data.enderecos[0].id).toBe(enderecoId);
    });

    it("rejeita documento inválido, CNPJ inválido, campos vazios e duplicado", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;

        await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({ documento: "", nome: "" })
            .expect(400);

        await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({ documento: "111", nome: "Cliente" })
            .expect(400);

        await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({ documento: "11222333000100", nome: "Empresa falsa" })
            .expect(400);

        const cnpj = uniqueCnpj();
        await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({ documento: cnpj, nome: "Pessoa Juridica" })
            .expect(201);

        await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({ documento: cnpj, nome: "Pessoa Juridica 2" })
            .expect(409);

        await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({ documento: uniqueCpf(), nome: "A".repeat(5000) })
            .expect(400);
    });

    it("não exclui cliente com OS e exige clienteDocumento no veículo", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;
        const documento = uniqueCpf();

        const cliente = await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({
                documento,
                nome: "Cliente com OS",
                veiculos: [{ modelo: "Uno", placa: "XYZ1A23" }]
            })
            .expect(201);

        const veiculoId = cliente.body.data.veiculos[0].id as number;
        const servico = await request(app)
            .post("/api/servico")
            .set(bearer(token))
            .send({ nome: "Alinhamento" })
            .expect(201);

        await request(app)
            .post("/api/ordem-servico")
            .set(bearer(token))
            .send({
                clienteDocumento: documento,
                veiculoId,
                itens: [{ servicoId: servico.body.data.id, quantidade: 1, valorObra: 100 }]
            })
            .expect(201);

        await request(app)
            .delete(`/api/cliente/${documento}`)
            .set(bearer(token))
            .expect(409);

        await request(app)
            .delete(`/api/veiculo/${veiculoId}`)
            .set(bearer(token))
            .expect(409);

        await request(app)
            .post("/api/veiculo")
            .set(bearer(token))
            .send({ modelo: "Fox", placa: "FOO1A23" })
            .expect(400);

        await request(app)
            .patch(`/api/cliente/${documento}`)
            .set(bearer(token))
            .send({ ativo: false })
            .expect(200);
    });

    it("altera o dono do veículo na edição", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;
        const dono = uniqueCpf();
        const novoDono = uniqueCpf();

        const veiculoRes = await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({
                documento: dono,
                nome: "Dono original",
                veiculos: [{ modelo: "Gol", placa: "ABC1D23" }]
            })
            .expect(201);

        await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({
                documento: novoDono,
                nome: "Novo dono"
            })
            .expect(201);

        const veiculoId = veiculoRes.body.data.veiculos[0].id as number;

        const updated = await request(app)
            .put(`/api/veiculo/${veiculoId}`)
            .set(bearer(token))
            .send({
                modelo: "Gol",
                placa: "ABC1D23",
                clienteDocumento: novoDono
            })
            .expect(200);

        expect(updated.body.data.clienteDocumento).toBe(novoDono);
    });

    it("atualiza empresa do JWT e rejeita id de outra oficina", async () => {
        const oficina = await cadastrarOficina(app);
        const outra = await cadastrarOficina(app);
        const token = oficina.token as string;

        const atual = await request(app).get("/api/empresa").set(bearer(token)).expect(200);
        expect(atual.body.data.id).toBe(oficina.empresaId);

        await request(app)
            .patch(`/api/empresa/${oficina.empresaId}`)
            .set(bearer(token))
            .send({ nome: "Oficina Renomeada" })
            .expect(200);

        await request(app)
            .patch(`/api/empresa/${outra.empresaId}`)
            .set(bearer(token))
            .send({ nome: "Hack" })
            .expect(404);
    });
});
