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

    it("é Não pago quando o valor do lançamento é zero", () => {
        expect(pagamentoSituacao({ valor: 0, valorPago: 0, dataLimitePagamento: null, now })).toBe(
            PAGAMENTO_SITUACAO.NAO_PAGO
        );
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
        expect(orcamento.body.data.pagamentoSituacao).toBeNull();

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

    it("não permite mudar OS existente para orçamento e nomeia o lançamento com data e id", async () => {
        const ctx = await seedOperacao();
        const created = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                itens: [{ servicoId: ctx.servicoId, quantidade: 1, valor: 80 }]
            })
            .expect(201);

        const osId = created.body.data.id as number;

        await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({ statusOsId: 6 })
            .expect(409);

        await request(app)
            .patch(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({ statusOsId: 4 })
            .expect(200);

        const got = await request(app)
            .get(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .expect(200);

        expect(got.body.data.registroEntradaSaida.nome).toMatch(
            new RegExp(`^\\d{2}/\\d{2}/\\d{4} - OS #${osId}$`)
        );

        const emptied = await request(app)
            .put(`/api/ordem-servico/${osId}`)
            .set(bearer(ctx.token))
            .send({
                clienteDocumento: ctx.documento,
                veiculoId: ctx.veiculoId,
                statusOsId: 3,
                itens: []
            })
            .expect(200);

        expect(emptied.body.data.pagamentoSituacao).toBe(PAGAMENTO_SITUACAO.NAO_PAGO);
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

        const itemsPatched = await request(app)
            .patch(`/api/ordem-servico/${os.body.data.id}`)
            .set(bearer(mecanicoToken))
            .send({
                itens: [{ servicoNome: "Disco", quantidade: 2, valor: 150 }]
            })
            .expect(200);

        expect(itemsPatched.body.data.itens).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    quantidade: 2,
                    valor: 150
                })
            ])
        );
        expect(itemsPatched.body.data.itens).toHaveLength(1);
    });

    it("com OS criar e só visualização de cliente, lista e atribui cliente existente sem cadastrar", async () => {
        const created = await cadastrarOficina(app);
        const token = created.token as string;
        const cargo = await criarCargo(app, token, JSON.stringify([
            PERMISSIONS.os.ver,
            PERMISSIONS.os.editar,
            PERMISSIONS.os.criar,
            PERMISSIONS.clientes.ver,
            PERMISSIONS.veiculos.ver,
            PERMISSIONS.funcionarios.ver,
            PERMISSIONS.financeiro.ver
        ]), "OS com cliente existente");
        const staff = await criarFuncionario(app, token, cargo.id, { nome: "Consultor OS" });
        const documento = uniqueCpf();
        const cliente = await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({
                documento,
                nome: "Cliente Ja Cadastrado",
                veiculos: [{ modelo: "Onix", placa: "OSI1234" }]
            })
            .expect(201);
        const veiculoId = cliente.body.data.veiculos[0].id as number;

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

        const listed = await request(app)
            .get("/api/cliente?limit=20")
            .set(bearer(staffToken))
            .expect(200);

        expect(listed.body.data.some((row: { documento: string }) => row.documento === documento)).toBe(true);

        await request(app)
            .post("/api/cliente")
            .set(bearer(staffToken))
            .send({
                documento: uniqueCpf(),
                nome: "Nao Deve Criar"
            })
            .expect(403);

        const listedVeiculos = await request(app)
            .get("/api/veiculo?limit=20")
            .set(bearer(staffToken))
            .expect(200);

        expect(listedVeiculos.body.data.some((row: { id: number }) => row.id === veiculoId)).toBe(true);

        await request(app)
            .post("/api/veiculo")
            .set(bearer(staffToken))
            .send({
                clienteDocumento: documento,
                modelo: "Novo",
                placa: "NOV9999"
            })
            .expect(403);

        const createdOs = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(staffToken))
            .send({
                clienteDocumento: documento,
                veiculoId,
                dataLimitePagamento: "2026-12-01"
            })
            .expect(201);

        expect(createdOs.body.data.dataLimitePagamento).toBeNull();
    });

    it("usuário com edição de OS atualiza a OS e cargo comum não gerencia funcionários", async () => {
        const created = await cadastrarOficina(app);
        const token = created.token as string;
        const osCargo = await criarCargo(app, token, JSON.stringify([
            PERMISSIONS.os.ver,
            PERMISSIONS.os.editar,
            PERMISSIONS.os.criar,
            PERMISSIONS.clientes.ver,
            PERMISSIONS.veiculos.ver
        ]), "OS operacional");
        const staff = await criarFuncionario(app, token, osCargo.id, { nome: "Consultor OS" });
        const documento = uniqueCpf();
        const cliente = await request(app)
            .post("/api/cliente")
            .set(bearer(token))
            .send({
                documento,
                nome: "Cliente OS Edit",
                veiculos: [{ modelo: "Ka", placa: "OSE1234" }]
            })
            .expect(201);
        const veiculoId = cliente.body.data.veiculos[0].id as number;
        const os = await request(app)
            .post("/api/ordem-servico")
            .set(bearer(token))
            .send({
                clienteDocumento: documento,
                veiculoId,
                diagnosticoCliente: "Barulho",
                itens: [{ servicoNome: "Revisão", quantidade: 1, valor: 40 }]
            })
            .expect(201);

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

        const updated = await request(app)
            .put(`/api/ordem-servico/${os.body.data.id}`)
            .set(bearer(staffToken))
            .send({
                clienteDocumento: documento,
                veiculoId,
                diagnosticoCliente: "Barulho",
                diagnosticoMecanico: "Folga",
                itens: [{ servicoNome: "Revisão", quantidade: 1, valor: 40 }]
            })
            .expect(200);

        expect(updated.body.data.diagnosticoMecanico).toBe("Folga");

        await request(app)
            .put(`/api/ordem-servico/${os.body.data.id}`)
            .set(bearer(staffToken))
            .send({
                clienteDocumento: documento,
                veiculoId,
                diagnosticoCliente: "Tentativa de alterar",
                diagnosticoMecanico: "Folga",
                itens: [{ servicoNome: "Revisão", quantidade: 1, valor: 40 }]
            })
            .expect(200);

        const kept = await request(app)
            .get(`/api/ordem-servico/${os.body.data.id}`)
            .set(bearer(staffToken))
            .expect(200);

        expect(kept.body.data.diagnosticoCliente).toBe("Barulho");

        const originalStatus = os.body.data.statusOsId as number;

        await request(app)
            .patch(`/api/ordem-servico/${os.body.data.id}`)
            .set(bearer(staffToken))
            .send({ statusOsId: 4 })
            .expect(200);

        const statusKept = await request(app)
            .get(`/api/ordem-servico/${os.body.data.id}`)
            .set(bearer(staffToken))
            .expect(200);

        expect(statusKept.body.data.statusOsId).toBe(originalStatus);

        await request(app)
            .post("/api/cargo")
            .set(bearer(staffToken))
            .send({
                nome: "Cargo bloqueado",
                nivelAcesso: JSON.stringify([PERMISSIONS.funcionarios.editar])
            })
            .expect(403);

        await request(app)
            .put(`/api/usuario/${staff.cpf}`)
            .set(bearer(staffToken))
            .send({ nome: "Nome novo" })
            .expect(403);
    });
});
