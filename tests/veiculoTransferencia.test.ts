import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { bearer, cadastrarOficina, uniqueCpf } from "./helpers.js";

const app = createApp();

describe("transferência de veículo entre clientes", () => {
    it("mantém o cliente da OS antiga e permite editá-la", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;
        const clienteA = uniqueCpf();
        const clienteB = uniqueCpf();

        const criadoA = await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({ documento: clienteA, nome: "Cliente A", veiculos: [{ modelo: "Gol", placa: "TRF1A23" }] })
            .expect(201);
        const veiculoId = criadoA.body.data.veiculos[0].id as number;

        await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({ documento: clienteB, nome: "Cliente B" })
            .expect(201);

        const servico = await request(app)
            .post("/api/servico")
            .set(bearer(token))
            .send({ nome: "Troca de óleo" })
            .expect(201);

        const os = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(token))
            .send({
                clienteDocumento: clienteA,
                veiculoId,
                statusOsId: 4,
                itens: [{ servicoId: servico.body.data.id, quantidade: 1, valor: 120 }]
            })
            .expect(201);
        const osId = os.body.data.id as number;

        await request(app)
            .patch(`/api/veiculo/${veiculoId}`)
            .set(bearer(token))
            .send({ clienteDocumento: clienteB })
            .expect(200);

        const antiga = await request(app)
            .get(`/api/ordem-servico/${osId}`)
            .set(bearer(token))
            .expect(200);

        expect(antiga.body.data.clienteDocumento).toBe(clienteA);
        expect(antiga.body.data.clienteNome).toBe("Cliente A");

        // The form sends the unchanged customer and vehicle back on save.
        const editada = await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(token))
            .send({ clienteDocumento: clienteA, veiculoId, obs: "Revisada após a transferência" })
            .expect(200);

        expect(editada.body.data.clienteDocumento).toBe(clienteA);

        // A new OS still requires the vehicle to belong to its customer.
        const novaOs = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(token))
            .send({ clienteDocumento: clienteA, veiculoId })
            .expect(400);

        expect(novaOs.body.error.fields.veiculoId).toBeTruthy();
    });
});
