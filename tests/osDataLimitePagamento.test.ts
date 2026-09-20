import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { bearer, cadastrarOficina, uniqueCpf } from "./helpers.js";

const app = createApp();

/** Cliente, veículo e serviço mínimos para abrir uma OS. */
async function seedOperacao(token: string) {
    const documento = uniqueCpf();
    const cliente = await request(app)
        .post("/api/cliente")
        .set(bearer(token))
        .send({
            documento,
            nome: "Cliente Prazo OS",
            veiculos: [{ modelo: "Corolla", placa: "PRZ2B34" }]
        })
        .expect(201);
    const veiculoId = cliente.body.data.veiculos[0].id as number;
    const servico = await request(app)
        .post("/api/servico")
        .set(bearer(token))
        .send({ nome: "Servico prazo OS" })
        .expect(201);

    return { documento, veiculoId, servicoId: servico.body.data.id as number };
}

async function criarOs(
    token: string,
    ctx: { documento: string; veiculoId: number; servicoId: number },
    extra: Record<string, unknown> = {}
) {
    const response = await request(app)
        .post("/api/ordem-servico")
        .set(bearer(token))
        .send({
            clienteDocumento: ctx.documento,
            veiculoId: ctx.veiculoId,
            itens: [{ servicoId: ctx.servicoId, quantidade: 1, valorObra: 100 }],
            ...extra
        })
        .expect(201);

    return response.body.data as {
        id: number;
        dataLimitePagamento: string | null;
        registroEntradaSaida: { id: number; dataLimitePagamento: string | null } | null;
    };
}

async function novoToken() {
    const oficina = await cadastrarOficina(app);

    return oficina.token as string;
}

describe("dataLimitePagamento na ordem de serviço", () => {
    it("guarda a data na OS mesmo sem lançamento gerado", async () => {
        const token = await novoToken();
        const os = await criarOs(token, await seedOperacao(token), {
            dataLimitePagamento: "2026-09-20"
        });

        expect(os.dataLimitePagamento).toBe("2026-09-20T00:00:00.000Z");
        expect(os.registroEntradaSaida).toBeNull();
    });

    it("cria a OS sem data quando não informada", async () => {
        const token = await novoToken();
        const os = await criarOs(token, await seedOperacao(token));

        expect(os.dataLimitePagamento).toBeNull();
    });

    it("copia a data da OS para o lançamento gerado na conclusão", async () => {
        const token = await novoToken();
        const os = await criarOs(token, await seedOperacao(token), {
            dataLimitePagamento: "2026-09-20"
        });

        const concluida = await request(app)
            .patch(`/api/ordem-servico/${os.id}`)
            .set(bearer(token))
            .send({ statusOsId: 4 })
            .expect(200);

        expect(concluida.body.data.registroEntradaSaida.dataLimitePagamento).toBe(
            "2026-09-20T00:00:00.000Z"
        );
    });

    it("não inventa prazo na conclusão quando a OS não tem data", async () => {
        const token = await novoToken();
        const os = await criarOs(token, await seedOperacao(token));

        const concluida = await request(app)
            .patch(`/api/ordem-servico/${os.id}`)
            .set(bearer(token))
            .send({ statusOsId: 4 })
            .expect(200);

        expect(concluida.body.data.registroEntradaSaida.dataLimitePagamento).toBeNull();
    });

    it("não sobrescreve a data ajustada no financeiro quando a OS é salva de novo", async () => {
        const token = await novoToken();
        const ctx = await seedOperacao(token);
        const os = await criarOs(token, ctx, {
            dataLimitePagamento: "2026-09-20"
        });

        const concluida = await request(app)
            .patch(`/api/ordem-servico/${os.id}`)
            .set(bearer(token))
            .send({ statusOsId: 4 })
            .expect(200);
        const registroId = concluida.body.data.registroEntradaSaida.id as number;

        // O financeiro passa a ser o dono do prazo.
        await request(app)
            .put(`/api/regentradasaida/${registroId}`)
            .set(bearer(token))
            .send({ dataLimitePagamento: "2026-10-01" })
            .expect(200);

        // Fluxo real do form da OS: PUT com o corpo completo, reenviando o
        // valor efetivo que estava em tela (o do lançamento).
        const reaberta = await request(app)
            .put(`/api/ordem-servico/${os.id}`)
            .set(bearer(token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                statusOsId: 4,
                obs: "sem alterar prazo",
                dataLimitePagamento: "2026-10-01"
            })
            .expect(200);

        expect(reaberta.body.data.registroEntradaSaida.dataLimitePagamento).toBe(
            "2026-10-01T00:00:00.000Z"
        );

        const registro = await request(app)
            .get(`/api/regentradasaida/${registroId}`)
            .set(bearer(token))
            .expect(200);

        expect(registro.body.data.dataLimitePagamento).toBe("2026-10-01T00:00:00.000Z");
    });

    it("mantém a data do lançamento quando a OS é salva sem enviar o campo", async () => {
        const token = await novoToken();
        const ctx = await seedOperacao(token);
        const os = await criarOs(token, ctx, {
            dataLimitePagamento: "2026-09-20"
        });

        const concluida = await request(app)
            .patch(`/api/ordem-servico/${os.id}`)
            .set(bearer(token))
            .send({ statusOsId: 4 })
            .expect(200);
        const registroId = concluida.body.data.registroEntradaSaida.id as number;

        await request(app)
            .put(`/api/regentradasaida/${registroId}`)
            .set(bearer(token))
            .send({ dataLimitePagamento: "2026-10-01" })
            .expect(200);

        // Sem o campo no corpo, o service não toca no prazo do lançamento.
        const salva = await request(app)
            .patch(`/api/ordem-servico/${os.id}`)
            .set(bearer(token))
            .send({ obs: "so observacao" })
            .expect(200);

        expect(salva.body.data.registroEntradaSaida.dataLimitePagamento).toBe(
            "2026-10-01T00:00:00.000Z"
        );
    });

    it("permite editar o prazo pela OS depois que o lançamento existe", async () => {
        const token = await novoToken();
        const os = await criarOs(token, await seedOperacao(token), {
            dataLimitePagamento: "2026-09-20"
        });

        const concluida = await request(app)
            .patch(`/api/ordem-servico/${os.id}`)
            .set(bearer(token))
            .send({ statusOsId: 4 })
            .expect(200);
        const registroId = concluida.body.data.registroEntradaSaida.id as number;

        const editada = await request(app)
            .patch(`/api/ordem-servico/${os.id}`)
            .set(bearer(token))
            .send({ dataLimitePagamento: "2026-12-24" })
            .expect(200);

        expect(editada.body.data.registroEntradaSaida.dataLimitePagamento).toBe(
            "2026-12-24T00:00:00.000Z"
        );

        const registro = await request(app)
            .get(`/api/regentradasaida/${registroId}`)
            .set(bearer(token))
            .expect(200);

        expect(registro.body.data.dataLimitePagamento).toBe("2026-12-24T00:00:00.000Z");
    });

    it("rejeita data inválida na OS", async () => {
        const token = await novoToken();
        const ctx = await seedOperacao(token);

        const response = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                dataLimitePagamento: "2026-02-31"
            })
            .expect(400);

        expect(response.body.error.fields.dataLimitePagamento).toBeTruthy();
    });
});

describe("filtro de data limite na lista de OS", () => {
    it("encontra a OS pelo prazo pendente, antes de existir lançamento", async () => {
        const token = await novoToken();
        const os = await criarOs(token, await seedOperacao(token), {
            dataLimitePagamento: "2027-03-15"
        });

        const lista = await request(app)
            .get("/api/ordem-servico?dataLimitePagamento=2027-03-15")
            .set(bearer(token))
            .expect(200);
        const ids = (lista.body.data as Array<{ id: number }>).map((row) => row.id);

        expect(ids).toContain(os.id);
    });

    it("ignora o prazo da OS depois que o lançamento existe e tem valor próprio", async () => {
        const token = await novoToken();
        const os = await criarOs(token, await seedOperacao(token), {
            dataLimitePagamento: "2027-04-10"
        });

        const concluida = await request(app)
            .patch(`/api/ordem-servico/${os.id}`)
            .set(bearer(token))
            .send({ statusOsId: 4 })
            .expect(200);
        const registroId = concluida.body.data.registroEntradaSaida.id as number;

        // O lançamento passa a valer outro dia; a coluna antiga da OS fica para trás.
        await request(app)
            .put(`/api/regentradasaida/${registroId}`)
            .set(bearer(token))
            .send({ dataLimitePagamento: "2027-05-20" })
            .expect(200);

        const naDataAntiga = await request(app)
            .get("/api/ordem-servico?dataLimitePagamento=2027-04-10")
            .set(bearer(token))
            .expect(200);

        expect((naDataAntiga.body.data as Array<{ id: number }>).map((row) => row.id)).not.toContain(
            os.id
        );

        const naDataNova = await request(app)
            .get("/api/ordem-servico?dataLimitePagamento=2027-05-20")
            .set(bearer(token))
            .expect(200);

        expect((naDataNova.body.data as Array<{ id: number }>).map((row) => row.id)).toContain(os.id);
    });
});
