import { describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { createApp } from "../src/app.js";
import { registrosEntradaSaida } from "../src/db/schema/index.js";
import { utcDayRange } from "../src/utils/utcDayRange.js";
import { bearer, cadastrarOficina, uniqueCpf } from "./helpers.js";

const app = createApp();

describe("dataLimitePagamento: intervalo do dia (UTC)", () => {
    it("cobre o dia inteiro, inclusive o último milissegundo", () => {
        const { start, end } = utcDayRange("2026-09-20");

        expect(start.toISOString()).toBe("2026-09-20T00:00:00.000Z");
        expect(end.toISOString()).toBe("2026-09-20T23:59:59.999Z");
    });

    it("não vaza para o mês seguinte no último dia", () => {
        const { end } = utcDayRange("2026-01-31");

        expect(end.toISOString()).toBe("2026-01-31T23:59:59.999Z");
    });

    it("aceita 29 de fevereiro em ano bissexto", () => {
        const { start } = utcDayRange("2028-02-29");

        expect(start.toISOString()).toBe("2028-02-29T00:00:00.000Z");
    });

    it("rejeita datas que o calendário não tem", () => {
        expect(() => utcDayRange("2026-02-31")).toThrow();
        expect(() => utcDayRange("2026-13-01")).toThrow();
        expect(() => utcDayRange("2027-02-29")).toThrow();
    });

    it("rejeita formatos ambíguos", () => {
        expect(() => utcDayRange("2026-9-2")).toThrow();
        expect(() => utcDayRange("20/09/2026")).toThrow();
        expect(() => utcDayRange("")).toThrow();
    });
});

describe("dataLimitePagamento nos registros", () => {
    async function seedRegistro(token: string) {
        const created = await request(app)
            .post("/api/regentradasaida")
            .set(bearer(token))
            .send({
                tipo: "saida",
                nome: "Compra de peças",
                valor: 80,
                dataLimitePagamento: "2026-09-20"
            })
            .expect(201);

        return created.body.data as { id: number; dataLimitePagamento: string | null };
    }

    async function novoToken() {
        const oficina = await cadastrarOficina(app);

        return oficina.token as string;
    }

    it("persiste a data na criação", async () => {
        const registro = await seedRegistro(await novoToken());

        expect(registro.dataLimitePagamento).toBe("2026-09-20T00:00:00.000Z");
    });

    it("devolve a data no detalhe sem deslocar o dia", async () => {
        const token = await novoToken();
        const registro = await seedRegistro(token);

        const detail = await request(app)
            .get(`/api/regentradasaida/${registro.id}`)
            .set(bearer(token))
            .expect(200);

        // O round-trip não pode virar 19/09: é o bug clássico de fuso horário.
        expect(detail.body.data.dataLimitePagamento).toBe("2026-09-20T00:00:00.000Z");
    });

    it("permite criar sem data", async () => {
        const created = await request(app)
            .post("/api/regentradasaida")
            .set(bearer(await novoToken()))
            .send({ tipo: "saida", nome: "Sem prazo", valor: 10 })
            .expect(201);

        expect(created.body.data.dataLimitePagamento).toBeNull();
    });

    it("edita e limpa a data", async () => {
        const token = await novoToken();
        const registro = await seedRegistro(token);

        const edited = await request(app)
            .put(`/api/regentradasaida/${registro.id}`)
            .set(bearer(token))
            .send({ dataLimitePagamento: "2026-10-05" })
            .expect(200);

        expect(edited.body.data.dataLimitePagamento).toBe("2026-10-05T00:00:00.000Z");

        const cleared = await request(app)
            .put(`/api/regentradasaida/${registro.id}`)
            .set(bearer(token))
            .send({ dataLimitePagamento: null })
            .expect(200);

        expect(cleared.body.data.dataLimitePagamento).toBeNull();
    });

    it("rejeita data inválida com erro no campo", async () => {
        const response = await request(app)
            .post("/api/regentradasaida")
            .set(bearer(await novoToken()))
            .send({
                tipo: "saida",
                nome: "Data ruim",
                valor: 10,
                dataLimitePagamento: "2026-02-31"
            })
            .expect(400);

        expect(response.body.error.fields.dataLimitePagamento).toBeTruthy();
    });

    it("rejeita formato que não seja aaaa-mm-dd", async () => {
        const response = await request(app)
            .post("/api/regentradasaida")
            .set(bearer(await novoToken()))
            .send({
                tipo: "saida",
                nome: "Formato ruim",
                valor: 10,
                dataLimitePagamento: "20/09/2026"
            })
            .expect(400);

        expect(response.body.error.fields.dataLimitePagamento).toBeTruthy();
    });

    it("filtra pelo dia e ignora os outros", async () => {
        const token = await novoToken();
        const alvo = await seedRegistro(token);
        const outro = await request(app)
            .post("/api/regentradasaida")
            .set(bearer(token))
            .send({
                tipo: "saida",
                nome: "Outro dia",
                valor: 20,
                dataLimitePagamento: "2026-09-21"
            })
            .expect(201);

        const lista = await request(app)
            .get("/api/regentradasaida?dataLimitePagamento=2026-09-20")
            .set(bearer(token))
            .expect(200);

        const ids = (lista.body.data as Array<{ id: number }>).map((row) => row.id);

        expect(ids).toContain(alvo.id);
        expect(ids).not.toContain(outro.body.data.id);
    });

    it("encontra o registro cujo prazo cai no meio do dia", async () => {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;
        const empresaId = oficina.empresaId as number;
        const registro = await seedRegistro(token);

        // Registros legados e do seed guardam o prazo com hora. Um filtro por
        // igualdade (`eq`) não acharia esta linha; só o intervalo do dia acha.
        const { openCompany } = await import("../src/config/database.js");
        const db = openCompany(empresaId);

        await db
            .update(registrosEntradaSaida)
            .set({ dataLimitePagamento: new Date("2026-09-20T14:30:00.000Z") })
            .where(eq(registrosEntradaSaida.id, registro.id));

        const lista = await request(app)
            .get("/api/regentradasaida?dataLimitePagamento=2026-09-20")
            .set(bearer(token))
            .expect(200);
        const ids = (lista.body.data as Array<{ id: number }>).map((row) => row.id);

        expect(ids).toContain(registro.id);
    });

    it("rejeita filtro com data inválida", async () => {
        await request(app)
            .get("/api/regentradasaida?dataLimitePagamento=2026-02-31")
            .set(bearer(await novoToken()))
            .expect(400);
    });

    it("filtra a OS pela data limite do registro vinculado", async () => {
        const token = await novoToken();
        const documento = uniqueCpf();
        const cliente = await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({
                documento,
                nome: "Cliente Prazo",
                veiculos: [{ modelo: "Onix", placa: "PRZ1A23" }]
            })
            .expect(201);
        const veiculoId = cliente.body.data.veiculos[0].id as number;
        const servico = await request(app)
            .post("/api/servico")
            .set(bearer(token))
            .send({ nome: "Servico Prazo" })
            .expect(201);
        const os = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(token))
            .send({
                clienteDocumento: documento,
                veiculoId,
                itens: [{ servicoId: servico.body.data.id, quantidade: 1, valorObra: 100 }]
            })
            .expect(201);
        const osId = os.body.data.id as number;

        const concluida = await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(token))
            .send({ statusOsId: 4 })
            .expect(200);

        const registroId = concluida.body.data.registroEntradaSaida.id as number;

        await request(app)
            .put(`/api/regentradasaida/${registroId}`)
            .set(bearer(token))
            .send({ dataLimitePagamento: "2026-11-11" })
            .expect(200);

        const naData = await request(app)
            .get("/api/ordem-servico?dataLimitePagamento=2026-11-11")
            .set(bearer(token))
            .expect(200);
        const osIds = (naData.body.data as Array<{ id: number }>).map((row) => row.id);

        expect(osIds).toContain(osId);

        const outroDia = await request(app)
            .get("/api/ordem-servico?dataLimitePagamento=2026-11-12")
            .set(bearer(token))
            .expect(200);

        expect((outroDia.body.data as Array<{ id: number }>).map((row) => row.id)).not.toContain(osId);
    });
});
