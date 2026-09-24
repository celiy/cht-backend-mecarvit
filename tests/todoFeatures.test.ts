import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { ACCESS, hasAccess, isSuperadmin, parsePermissions, PERMISSIONS } from "@shared/mecarvit/access";
import { PAGAMENTO_SITUACAO, pagamentoSituacao } from "@shared/mecarvit/pagamentoSituacao";
import { bearer, cadastrarOficina, criarCargo, criarFuncionario, SENHA_NOVA, uniqueCpf } from "./helpers.js";

const app = createApp();

describe("catálogo de permissões", () => {
    it("trata superadmin em JSON e no dígito legado 0", () => {
        expect(isSuperadmin("0")).toBe(true);
        expect(isSuperadmin(JSON.stringify([PERMISSIONS.SUPERADMIN]))).toBe(true);
        expect(isSuperadmin(JSON.stringify([PERMISSIONS.os.editar]))).toBe(false);
    });

    it("converte dígitos concatenados em chaves nomeadas", () => {
        const keys = parsePermissions("34");

        expect(keys).toContain(PERMISSIONS.os.editar);
        expect(keys).toContain(PERMISSIONS.veiculos.editar);
        expect(hasAccess("34", ACCESS.OS)).toBe(true);
        expect(hasAccess("34", ACCESS.FUNCIONARIOS)).toBe(false);
    });

    it("não abre área só com visualização", () => {
        const nivel = JSON.stringify([PERMISSIONS.clientes.ver]);

        expect(hasAccess(nivel, PERMISSIONS.clientes.ver)).toBe(true);
        expect(hasAccess(nivel, ACCESS.CLIENTES)).toBe(false);
    });
});

describe("situação de pagamento", () => {
    const now = new Date("2026-09-23T12:00:00.000Z");

    it("é Pago quando a soma cobre o valor", () => {
        expect(
            pagamentoSituacao({ valor: 100, valorPago: 100, dataLimitePagamento: "2026-01-01", now })
        ).toBe(PAGAMENTO_SITUACAO.PAGO);
    });

    it("é A vencer quando há prazo futuro", () => {
        expect(
            pagamentoSituacao({ valor: 100, valorPago: 10, dataLimitePagamento: "2026-09-30", now })
        ).toBe(PAGAMENTO_SITUACAO.A_VENCER);
    });

    it("é Não pago sem prazo", () => {
        expect(pagamentoSituacao({ valor: 100, valorPago: 0, dataLimitePagamento: null, now })).toBe(
            PAGAMENTO_SITUACAO.NAO_PAGO
        );
    });

    it("é Atrasado quando o prazo já passou", () => {
        expect(
            pagamentoSituacao({ valor: 100, valorPago: 0, dataLimitePagamento: "2026-09-01", now })
        ).toBe(PAGAMENTO_SITUACAO.ATRASADO);
    });
});

describe("regras de OS e pagamentos", () => {
    async function seedOperacao() {
        const oficina = await cadastrarOficina(app);
        const token = oficina.token as string;
        const documento = uniqueCpf();
        const cliente = await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({
                documento,
                nome: "Cliente Todo",
                veiculos: [{ modelo: "Uno", placa: "TODO123" }]
            })
            .expect(201);
        const veiculoId = cliente.body.data.veiculos[0].id as number;
        const servico = await request(app)
            .post("/api/servico")
            .set(bearer(token))
            .send({ nome: "Alinhamento" })
            .expect(201);

        return {
            token,
            documento,
            veiculoId,
            servicoId: servico.body.data.id as number
        };
    }

    it("cria OS de orçamento e recusa pagamento em OS cancelada", async () => {
        const ctx = await seedOperacao();

        const orcamento = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                statusOsId: 6,
                itens: [{ servicoId: ctx.servicoId, quantidade: 1, valor: 150 }]
            })
            .expect(201);

        expect(orcamento.body.data.statusOsId).toBe(6);
        expect(orcamento.body.data.itens[0].valor).toBe(150);
        expect(orcamento.body.data.total).toBe(150);

        const osId = orcamento.body.data.id as number;

        await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({ statusOsId: 5 })
            .expect(200);

        const blocked = await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({ pagamentos: [{ tipo: "pix", valor: 10 }] })
            .expect(409);

        expect(blocked.body.error.message).toMatch(/cancelad/i);
    });

    it("recusa pagamento maior que o valor do lançamento", async () => {
        const ctx = await seedOperacao();

        const created = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                itens: [{ servicoId: ctx.servicoId, quantidade: 1, valor: 100 }]
            })
            .expect(201);

        const osId = created.body.data.id as number;

        await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({ statusOsId: 4 })
            .expect(200);

        const overflow = await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({ pagamentos: [{ tipo: "pix", valor: 120 }] })
            .expect(400);

        expect(overflow.body.error.fields.pagamentos).toBeTruthy();
    });

    it("devolve a situação de pagamento na OS", async () => {
        const ctx = await seedOperacao();

        const created = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                dataLimitePagamento: "2026-09-30",
                itens: [{ servicoId: ctx.servicoId, quantidade: 1, valor: 80 }]
            })
            .expect(201);

        expect(created.body.data.pagamentoSituacao).toBe(PAGAMENTO_SITUACAO.A_VENCER);
    });
});

describe("cargos pré-configurados e mecânico", () => {
    it("impede não-superadmin de alterar cargo Gerente e de resetar senha", async () => {
        const created = await cadastrarOficina(app);
        const token = created.token as string;
        const operacional = await criarCargo(app, token, JSON.stringify([
            PERMISSIONS.funcionarios.ver,
            PERMISSIONS.funcionarios.editar,
            PERMISSIONS.funcionarios.criar,
            PERMISSIONS.funcionarios.excluir
        ]), "Operacional cargos");
        const staff = await criarFuncionario(app, token, operacional.id, { nome: "Gestor de RH" });
        const alvo = await criarFuncionario(app, token, operacional.id, { nome: "Alvo Reset" });
        await request(app)
            .post(`/api/usuario/${staff.cpf}/senha`)
            .set(bearer(token))
            .send({ senhaAtual: staff.senha, senhaNova: SENHA_NOVA })
            .expect(200);
        const login = await request(app)
            .post("/api/login")
            .send({ email: staff.email, senha: SENHA_NOVA, empresaId: created.empresaId })
            .expect(200);
        const staffToken = login.body.data.token as string;

        const cargos = await request(app)
            .get("/api/cargo?limit=100")
            .set(bearer(token))
            .expect(200);
        const gerente = (cargos.body.data as Array<{ id: number; nome: string }>).find(
            (cargo) => cargo.nome === "Gerente"
        );

        expect(gerente).toBeTruthy();

        await request(app)
            .patch(`/api/cargo/${gerente?.id}`)
            .set(bearer(staffToken))
            .send({ nome: "Gerente 2" })
            .expect(403);

        await request(app)
            .put(`/api/usuario/${alvo.cpf}`)
            .set(bearer(staffToken))
            .send({ senha: "SenhaNova99", senhaInicial: true })
            .expect(403);
    });

    it("mecânico vê OS sem documento do cliente e não cria OS", async () => {
        const created = await cadastrarOficina(app);
        const token = created.token as string;
        const mecanicoCargo = await criarCargo(app, token, JSON.stringify([
            PERMISSIONS.os.ver,
            PERMISSIONS.os.editar,
            PERMISSIONS.os.diagnosticoEditar
        ]), "Mecanico teste");
        const mecanico = await criarFuncionario(app, token, mecanicoCargo.id, { nome: "Mecanico OS" });
        const documento = uniqueCpf();
        const cliente = await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({
                documento,
                nome: "Cliente Mecanico",
                veiculos: [{ modelo: "Gol", placa: "MEC1234" }]
            })
            .expect(201);
        const veiculoId = cliente.body.data.veiculos[0].id as number;
        const os = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(token))
            .send({
                clienteDocumento: documento,
                veiculoId,
                diagnosticoMecanico: "Trocar pastilha",
                itens: [{ servicoNome: "Freio", quantidade: 1, valor: 90 }]
            })
            .expect(201);

        await request(app)
            .post(`/api/usuario/${mecanico.cpf}/senha`)
            .set(bearer(token))
            .send({ senhaAtual: mecanico.senha, senhaNova: SENHA_NOVA })
            .expect(200);

        const login = await request(app)
            .post("/api/login")
            .send({ email: mecanico.email, senha: SENHA_NOVA, empresaId: created.empresaId })
            .expect(200);
        const mecanicoToken = login.body.data.token as string;

        await request(app)
            .post("/api/ordem-servico")
            .set(bearer(mecanicoToken))
            .send({ clienteDocumento: documento, veiculoId })
            .expect(403);

        const got = await request(app)
            .get(`/api/ordem-servico/${os.body.data.id}`)
            .set(bearer(mecanicoToken))
            .expect(200);

        expect(got.body.data.clienteNome).toBe("Cliente Mecanico");
        expect(got.body.data.clienteDocumento).toBe("");
        expect(got.body.data.pagamentos).toEqual([]);

        const patched = await request(app)
            .patch(`/api/ordem-servico/${os.body.data.id}`)
            .set(bearer(mecanicoToken))
            .send({ diagnosticoMecanico: "Pastilha e disco", obs: "Ok" })
            .expect(200);

        expect(patched.body.data.diagnosticoMecanico).toBe("Pastilha e disco");
    });
});
