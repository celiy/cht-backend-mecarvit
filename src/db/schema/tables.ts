import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { mockFlag, timestamps } from "./timestamps.js";

export const empresas = sqliteTable("empresa", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    ...timestamps(),
    ...mockFlag()
});

export const cargos = sqliteTable("cargo", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    nivelAcesso: text("nivel_acesso").notNull(),
    ...timestamps(),
    ...mockFlag()
});

export const usuarios = sqliteTable("usuario", {
    cpf: text("cpf").primaryKey(),
    nome: text("nome").notNull(),
    email: text("email").notNull().unique(),
    senha: text("senha").notNull(),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    senhaInicial: integer("senha_inicial", { mode: "boolean" }).notNull().default(false),
    fundador: integer("fundador", { mode: "boolean" }).notNull().default(false),
    cargoId: integer("cargo_id")
        .notNull()
        .references(() => cargos.id),
    empresaId: integer("empresa_id")
        .notNull()
        .references(() => empresas.id),
    ...timestamps(),
    ...mockFlag()
});

export const enderecos = sqliteTable("endereco", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    estado: text("estado").notNull(),
    cidade: text("cidade").notNull(),
    cep: text("cep").notNull(),
    bairro: text("bairro").notNull(),
    rua: text("rua").notNull(),
    numero: integer("numero").notNull(),
    complemento: text("complemento").notNull(),
    ...mockFlag()
});

export const clientes = sqliteTable("cliente", {
    documento: text("documento").primaryKey(),
    nome: text("nome").notNull(),
    nomeSocial: text("nome_social"),
    cel: text("cel"),
    email: text("email").unique(),
    obs: text("obs"),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    usuarioCpf: text("usuario_cpf")
        .notNull()
        .references(() => usuarios.cpf),
    ...timestamps(),
    ...mockFlag()
});

export const enderecosCliente = sqliteTable(
    "endereco_cliente",
    {
        clienteDocumento: text("cliente_documento")
            .notNull()
            .references(() => clientes.documento, { onDelete: "cascade" }),
        enderecoId: integer("endereco_id")
            .notNull()
            .references(() => enderecos.id, { onDelete: "cascade" }),
        ...mockFlag()
    },
    (table) => ({
        pk: primaryKey({ columns: [table.clienteDocumento, table.enderecoId] })
    })
);

export const veiculos = sqliteTable("veiculo", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    modelo: text("modelo").notNull(),
    placa: text("placa").notNull(),
    tipo: text("tipo"),
    kilometragem: real("kilometragem"),
    dataTrocaOleo: integer("data_troca_oleo", { mode: "timestamp" }),
    chassi: text("chassi").unique(),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    clienteDocumento: text("cliente_documento")
        .notNull()
        .references(() => clientes.documento),
    ...timestamps(),
    ...mockFlag()
});

export const servicos = sqliteTable("servico", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    ...timestamps(),
    ...mockFlag()
});

export const statusOs = sqliteTable("status_os", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull().unique(),
    ...mockFlag()
});

export const registrosEntradaSaida = sqliteTable("reg_entrada_saida", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    descricao: text("descricao"),
    dataLimitePagamento: integer("data_limite_pagamento", { mode: "timestamp" }),
    tipo: text("tipo").notNull(),
    valor: real("valor").notNull(),
    usuarioCpf: text("usuario_cpf")
        .notNull()
        .references(() => usuarios.cpf),
    ...timestamps(),
    ...mockFlag()
});

export const ordensServico = sqliteTable("ordem_servico", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    dataInicio: integer("data_inicio", { mode: "timestamp" }),
    dataConclusao: integer("data_conclusao", { mode: "timestamp" }),
    /**
     * Deadline agreed with the customer for the receivable this OS generates.
     * It seeds `registro_entrada_saida.data_limite_pagamento` when that record
     * is created; from then on the record owns the value.
     */
    dataLimitePagamento: integer("data_limite_pagamento", { mode: "timestamp" }),
    diagnosticoCliente: text("diagnostico_cliente"),
    diagnosticoMecanico: text("diagnostico_mecanico"),
    obs: text("obs"),
    veiculoId: integer("veiculo_id")
        .notNull()
        .references(() => veiculos.id),
    clienteDocumento: text("cliente_documento")
        .notNull()
        .references(() => clientes.documento),
    regEntradaSaidaId: integer("reg_entrada_saida_id")
        .unique()
        .references(() => registrosEntradaSaida.id, { onDelete: "set null" }),
    statusOsId: integer("status_os_id")
        .notNull()
        .references(() => statusOs.id),
    ...timestamps(),
    ...mockFlag()
});

export const itensServico = sqliteTable("item_servico", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    quantidade: integer("quantidade").notNull(),
    valorPecas: real("valor_pecas"),
    valorObra: real("valor_obra").notNull(),
    ordemServicoId: integer("ordem_servico_id")
        .notNull()
        .references(() => ordensServico.id, { onDelete: "cascade" }),
    servicoId: integer("servico_id")
        .notNull()
        .references(() => servicos.id),
    ...mockFlag()
});

export const responsaveis = sqliteTable(
    "responsavel",
    {
        usuarioCpf: text("usuario_cpf")
            .notNull()
            .references(() => usuarios.cpf),
        ordemServicoId: integer("ordem_servico_id")
            .notNull()
            .references(() => ordensServico.id, { onDelete: "cascade" }),
        ...mockFlag()
    },
    (table) => ({
        pk: primaryKey({ columns: [table.usuarioCpf, table.ordemServicoId] })
    })
);

export const pagamentos = sqliteTable("pagamento", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tipo: text("tipo").notNull(),
    valor: real("valor").notNull(),
    regEntradaSaidaId: integer("reg_entrada_saida_id")
        .notNull()
        .references(() => registrosEntradaSaida.id, { onDelete: "cascade" }),
    ...timestamps(),
    ...mockFlag()
});

export const STATUS_OS = {
    ABERTA: 1,
    PENDENTE: 2,
    EM_ANDAMENTO: 3,
    CONCLUIDA: 4,
    CANCELADA: 5
} as const;

export const STATUS_OS_NOMES = [
    "aberta",
    "pendente",
    "em andamento",
    "concluída",
    "cancelada"
] as const;
