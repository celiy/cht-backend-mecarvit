import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { bearer, cadastrarOficina, uniqueCpf } from "./helpers.js";

const app = createApp();

describe("ordem de serviço, financeiro e dashboard", () => {
    async function seedOperacao() {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;
        const documento = uniqueCpf();
        const cliente = await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({
                documento,
                nome: "Cliente OS",
                veiculos: [{ modelo: "Civic", placa: "CIV1A23" }]
            })
            .expect(201);
        const veiculoId = cliente.body.data.veiculos[0].id as number;
        const servico = await request(app)
            .post("/api/servico")
            .set(bearer(token))
            .send({ nome: "Revisao" })
            .expect(201);

        return {
            token,
            documento,
            veiculoId,
            servicoId: servico.body.data.id as number
        };
    }

    it("concluir OS gera uma entrada e pagamento parcial não duplica o RES", async () => {
        const ctx = await seedOperacao();

        const created = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                itens: [{ servicoId: ctx.servicoId, quantidade: 1, valorObra: 150, valorPecas: 50 }]
            })
            .expect(201);

        expect(created.body.data.registroEntradaSaida).toBeNull();
        expect(created.body.data.total).toBe(200);

        const osId = created.body.data.id as number;

        const concluida = await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({ statusOsId: 4 })
            .expect(200);

        expect(concluida.body.data.registroEntradaSaida).toBeTruthy();
        expect(concluida.body.data.registroEntradaSaida.tipo).toBe("entrada");
        expect(concluida.body.data.registroEntradaSaida.nome).toContain("Cliente OS");
        const resId = concluida.body.data.registroEntradaSaida.id as number;

        const pagamento1 = await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({ pagamentos: [{ tipo: "dinheiro", valor: 80 }] })
            .expect(200);

        expect(pagamento1.body.data.registroEntradaSaida.id).toBe(resId);
        expect(pagamento1.body.data.pagamentos).toHaveLength(1);

        const pagamento2 = await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({ pagamentos: [{ tipo: "pix", valor: 20 }] })
            .expect(200);

        expect(pagamento2.body.data.registroEntradaSaida.id).toBe(resId);
        expect(pagamento2.body.data.pagamentos).toHaveLength(2);

        const listaRes = await request(app)
            .get("/api/regentradasaida")
            .set(bearer(ctx.token))
            .expect(200);

        const daOs = (listaRes.body.data as Array<{ id: number }>).filter((item) => item.id === resId);
        expect(daOs).toHaveLength(1);

        await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({ statusOsId: 5 })
            .expect(409);
    });

    it("PUT de pagamentos preserva criadoEm dos itens não alterados", async () => {
        const ctx = await seedOperacao();
        const created = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                itens: [{ servicoId: ctx.servicoId, quantidade: 1, valorObra: 100 }]
            })
            .expect(201);
        const osId = created.body.data.id as number;

        const firstSave = await request(app)
            .put(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({
                pagamentos: [
                    { tipo: "dinheiro", valor: 40 },
                    { tipo: "pix", valor: 30 }
                ]
            })
            .expect(200);

        const original = firstSave.body.data.pagamentos as Array<{
            id: number;
            tipo: string;
            valor: number;
            criadoEm: string;
            modificadoEm: string;
        }>;

        expect(original).toHaveLength(2);

        const kept = original[0];
        const edited = original[1];

        expect(kept).toBeTruthy();
        expect(edited).toBeTruthy();

        await new Promise((resolve) => {
            setTimeout(resolve, 1200);
        });

        const secondSave = await request(app)
            .put(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({
                pagamentos: [
                    { id: kept!.id, tipo: kept!.tipo, valor: kept!.valor },
                    { id: edited!.id, tipo: edited!.tipo, valor: 35 }
                ]
            })
            .expect(200);

        const next = secondSave.body.data.pagamentos as Array<{
            id: number;
            valor: number;
            criadoEm: string;
            modificadoEm: string;
        }>;
        const keptNext = next.find((row) => row.id === kept!.id);
        const editedNext = next.find((row) => row.id === edited!.id);

        expect(keptNext?.criadoEm).toBe(kept!.criadoEm);
        expect(keptNext?.modificadoEm).toBe(kept!.modificadoEm);
        expect(editedNext?.criadoEm).toBe(edited!.criadoEm);
        expect(editedNext?.valor).toBe(35);
        expect(new Date(editedNext!.modificadoEm).getTime()).toBeGreaterThan(
            new Date(edited!.modificadoEm).getTime()
        );
    });

    it("reabrir concluída sem pagamento remove o RES; cancelar com pagamento retorna 409", async () => {
        const ctx = await seedOperacao();

        const created = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                itens: [{ servicoId: ctx.servicoId, quantidade: 1, valorObra: 90 }]
            })
            .expect(201);

        const osId = created.body.data.id as number;

        await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({ statusOsId: 4 })
            .expect(200);

        const reaberta = await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({ statusOsId: 1 })
            .expect(200);

        expect(reaberta.body.data.registroEntradaSaida).toBeNull();

        const paga = await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({ pagamentos: [{ tipo: "debito", valor: 90 }] })
            .expect(200);

        expect(paga.body.data.registroEntradaSaida).toBeTruthy();

        await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({ statusOsId: 5 })
            .expect(409);
    });

    it("lançamento manual de entrada/saída e dashboard", async () => {
        const ctx = await seedOperacao();

        await request(app)
            .post("/api/regentradasaida")
            .set(bearer(ctx.token))
            .send({ tipo: "saida", nome: "Compra de pecas", valor: 40 })
            .expect(201);

        const status = await request(app)
            .get("/api/dashboard/os-status")
            .set(bearer(ctx.token))
            .expect(200);

        expect(Array.isArray(status.body.data)).toBe(true);
        expect(status.body.data.some((item: { nome: string }) => item.nome === "aberta")).toBe(true);

        const fluxo = await request(app)
            .get(`/api/dashboard/fluxo-mensal?ano=${new Date().getFullYear()}`)
            .set(bearer(ctx.token))
            .expect(200);

        expect(fluxo.body.data.meses).toHaveLength(12);
        const totalSaida = (fluxo.body.data.meses as Array<{ saida: number }>)
            .reduce((sum, item) => sum + item.saida, 0);
        expect(totalSaida).toBeGreaterThanOrEqual(40);

        await request(app)
            .get("/api/status-os")
            .set(bearer(ctx.token))
            .expect(200);
    });

    it("rejeita OS sem cliente/veículo e serviço em uso", async () => {
        const ctx = await seedOperacao();

        await request(app)
            .post("/api/ordem-servico")
            .set(bearer(ctx.token))
            .send({})
            .expect(400);

        await request(app)
            .delete(`/api/servico/${ctx.servicoId}`)
            .set(bearer(ctx.token))
            .expect(204);

        const used = await request(app)
            .post("/api/servico")
            .set(bearer(ctx.token))
            .send({ nome: "Pintura" })
            .expect(201);

        await request(app)
            .post("/api/ordem-servico")
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                itens: [{ servicoId: used.body.data.id, quantidade: 1, valorObra: 10 }]
            })
            .expect(201);

        await request(app)
            .delete(`/api/servico/${used.body.data.id}`)
            .set(bearer(ctx.token))
            .expect(409);
    });

    it("limpa observações e diagnósticos com null no PUT", async () => {
        const ctx = await seedOperacao();

        const created = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                obs: "Observação da OS",
                diagnosticoCliente: "Barulho na suspensão",
                diagnosticoMecanico: "Amortecedor",
                itens: [{ servicoId: ctx.servicoId, quantidade: 1, valorObra: 50 }]
            })
            .expect(201);

        const osId = created.body.data.id as number;

        await request(app)
            .put(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                statusOsId: created.body.data.statusOsId,
                obs: null,
                diagnosticoCliente: null,
                diagnosticoMecanico: null,
                itens: [{ servicoId: ctx.servicoId, quantidade: 1, valorObra: 50 }]
            })
            .expect(200);

        const got = await request(app)
            .get(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .expect(200);

        expect(got.body.data.obs).toBeNull();
        expect(got.body.data.diagnosticoCliente).toBeNull();
        expect(got.body.data.diagnosticoMecanico).toBeNull();
    });

    it("não exclui OS com itens, pagamento ou entrada ligada; exclui OS vazia", async () => {
        const ctx = await seedOperacao();

        const vazia = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId
            })
            .expect(201);

        await request(app)
            .delete(`/api/ordem-servico/${vazia.body.data.id}`)
            .set(bearer(ctx.token))
            .expect(204);

        const comItens = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                itens: [{ servicoId: ctx.servicoId, quantidade: 1, valorObra: 50 }]
            })
            .expect(201);

        await request(app)
            .delete(`/api/ordem-servico/${comItens.body.data.id}`)
            .set(bearer(ctx.token))
            .expect(409);

        await request(app)
            .get(`/api/ordem-servico/${comItens.body.data.id}`)
            .set(bearer(ctx.token))
            .expect(200);

        const comPagamento = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                pagamentos: [{ tipo: "dinheiro", valor: 10 }]
            })
            .expect(201);

        await request(app)
            .delete(`/api/ordem-servico/${comPagamento.body.data.id}`)
            .set(bearer(ctx.token))
            .expect(409);

        const concluida = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                statusOsId: 4
            })
            .expect(201);

        expect(concluida.body.data.registroEntradaSaida).toBeTruthy();

        await request(app)
            .delete(`/api/ordem-servico/${concluida.body.data.id}`)
            .set(bearer(ctx.token))
            .expect(409);
    });

    it("aceita duas linhas do mesmo serviço na mesma OS", async () => {
        const ctx = await seedOperacao();

        const created = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                itens: [
                    { servicoId: ctx.servicoId, quantidade: 1, valorObra: 100, valorPecas: 0 },
                    { servicoId: ctx.servicoId, quantidade: 2, valorObra: 50, valorPecas: 20 }
                ]
            })
            .expect(201);

        expect(created.body.data.itens).toHaveLength(2);
        expect(created.body.data.total).toBe(240);
    });
});
