type Example = {
    sent: unknown;
    response: unknown;
};

const listMeta = {
    page: 1,
    limit: 10,
    total: 1
};

const usuario = {
    cpf: "39053344705",
    nome: "Ana Gestora",
    email: "ana@oficina.test",
    ativo: true,
    senhaInicial: false,
    fundador: true,
    cargoId: 1,
    empresaId: 1,
    nivelAcesso: "0",
    cargoNome: "Superadmin",
    criadoEm: "2026-01-15T12:00:00.000Z",
    modificadoEm: "2026-01-15T12:00:00.000Z"
};

const empresa = {
    id: 1,
    nome: "Oficina Central",
    criadoEm: "2026-01-15T12:00:00.000Z",
    modificadoEm: "2026-01-15T12:00:00.000Z"
};

const cliente = {
    documento: "39053344705",
    nome: "João da Silva",
    email: "joao@cliente.test",
    cel: "11999990000",
    ativo: true,
    enderecos: [
        {
            id: 1,
            estado: "SP",
            cidade: "São Paulo",
            cep: "01001000",
            bairro: "Sé",
            rua: "Praça da Sé",
            numero: 1,
            complemento: "Sala 1"
        }
    ],
    veiculos: [
        {
            id: 1,
            modelo: "Gol",
            placa: "ABC1D23",
            clienteDocumento: "39053344705"
        }
    ],
    ordensServico: []
};

const os = {
    id: 1,
    clienteDocumento: "39053344705",
    veiculoId: 1,
    statusOsId: 1,
    itens: [
        {
            servicoId: 1,
            quantidade: 1,
            valorObra: 150,
            valorPecas: 20
        }
    ],
    responsaveis: ["39053344705"],
    pagamentos: [],
    registroEntradaSaida: null,
    total: 170
};

const examples: Record<string, Example> = {
    "POST /api/cadastro": {
        sent: {
            empresa: { nome: "Oficina Central" },
            usuario: {
                cpf: "390.533.447-05",
                nome: "Ana Gestora",
                email: "ana@oficina.test",
                senha: "SenhaForte1"
            }
        },
        response: {
            data: {
                token: "jwt",
                usuario,
                empresa: { id: 1, nome: "Oficina Central" },
                precisaTrocarSenha: false
            }
        }
    },
    "POST /api/login": {
        sent: {
            email: "ana@oficina.test",
            senha: "SenhaForte1"
        },
        response: {
            data: {
                token: "jwt",
                usuario,
                empresa: { id: 1 },
                precisaTrocarSenha: false
            }
        }
    },
    "GET /api/empresa-locais": {
        sent: {},
        response: {
            data: [{ id: 1, nome: "Oficina Central" }]
        }
    },
    "GET /health": {
        sent: {},
        response: { status: "ok", at: "2026-01-15T12:00:00.000Z" }
    },
    "GET /api/me": {
        sent: {},
        response: { data: usuario }
    },
    "GET /api/usuario": {
        sent: {},
        response: { data: [usuario], ...listMeta }
    },
    "POST /api/usuario": {
        sent: {
            cpf: "529.982.247-25",
            nome: "Bruno Funcionario",
            email: "bruno@oficina.test",
            senha: "SenhaForte1",
            cargoId: 2
        },
        response: { data: { ...usuario, cpf: "52998224725", fundador: false, senhaInicial: true } }
    },
    "GET /api/usuario/:cpf": {
        sent: {},
        response: { data: usuario }
    },
    "PUT /api/usuario/:cpf": {
        sent: { nome: "Ana Gestora", email: "ana@oficina.test", cargoId: 1, ativo: true },
        response: { data: usuario }
    },
    "PATCH /api/usuario/:cpf": {
        sent: { ativo: false },
        response: { data: { ...usuario, ativo: false } }
    },
    "POST /api/usuario/:cpf/senha": {
        sent: { senhaAtual: "SenhaForte1", senhaNova: "OutraSenha1" },
        response: { data: usuario }
    },
    "GET /api/cargo": {
        sent: {},
        response: { data: [{ id: 1, nome: "Superadmin", nivelAcesso: "0" }], ...listMeta }
    },
    "POST /api/cargo": {
        sent: { nome: "Atendente", nivelAcesso: "2" },
        response: { data: { id: 2, nome: "Atendente", nivelAcesso: "2" } }
    },
    "GET /api/empresa": {
        sent: {},
        response: { data: empresa }
    },
    "GET /api/empresa/:id": {
        sent: {},
        response: { data: empresa }
    },
    "PUT /api/empresa/:id": {
        sent: { nome: "Oficina Central" },
        response: { data: empresa }
    },
    "PATCH /api/empresa/:id": {
        sent: { nome: "Oficina Norte" },
        response: { data: { ...empresa, nome: "Oficina Norte" } }
    },
    "GET /api/cliente": {
        sent: {},
        response: { data: [cliente], ...listMeta }
    },
    "POST /api/cliente": {
        sent: {
            documento: "390.533.447-05",
            nome: "João da Silva",
            enderecos: [
                {
                    estado: "SP",
                    cidade: "São Paulo",
                    cep: "01001000",
                    bairro: "Sé",
                    rua: "Praça da Sé",
                    numero: 1,
                    complemento: "Sala 1"
                }
            ],
            veiculos: [{ modelo: "Gol", placa: "ABC1D23" }]
        },
        response: { data: cliente }
    },
    "GET /api/cliente/:documento": {
        sent: {},
        response: { data: cliente }
    },
    "DELETE /api/cliente/:documento": {
        sent: {},
        response: {}
    },
    "POST /api/veiculo": {
        sent: { modelo: "Gol", placa: "ABC1D23", clienteDocumento: "39053344705" },
        response: { data: { id: 1, modelo: "Gol", placa: "ABC1D23", clienteDocumento: "39053344705" } }
    },
    "POST /api/servico": {
        sent: { nome: "Troca de óleo" },
        response: { data: { id: 1, nome: "Troca de óleo" } }
    },
    "GET /api/ordem-servico/:id": {
        sent: {},
        response: { data: os }
    },
    "PUT /api/ordem-servico/:id": {
        sent: {
            clienteDocumento: "39053344705",
            veiculoId: 1,
            statusOsId: 3,
            itens: [{ servicoId: 1, quantidade: 1, valorObra: 150, valorPecas: 20 }]
        },
        response: { data: { ...os, statusOsId: 3 } }
    },
    "GET /api/status-os": {
        sent: {},
        response: {
            data: [
                { id: 1, nome: "aberta" },
                { id: 2, nome: "pendente" },
                { id: 3, nome: "em andamento" },
                { id: 4, nome: "concluída" },
                { id: 5, nome: "cancelada" }
            ],
            ...listMeta,
            total: 5
        }
    },
    "POST /api/ordem-servico": {
        sent: {
            clienteDocumento: "39053344705",
            veiculoId: 1,
            itens: [{ servicoId: 1, quantidade: 1, valorObra: 150, valorPecas: 20 }]
        },
        response: { data: os }
    },
    "PATCH /api/ordem-servico/:id": {
        sent: { statusOsId: 4 },
        response: { data: { ...os, statusOsId: 4 } }
    },
    "POST /api/regentradasaida": {
        sent: { tipo: "saida", nome: "Compra de peças", valor: 80 },
        response: { data: { id: 1, tipo: "saida", nome: "Compra de peças", valor: 80, pagamentos: [], ordemServico: null } }
    },
    "GET /api/dashboard/financeiro-cards": {
        sent: { periodo: "esta_semana" },
        response: {
            data: {
                periodo: "esta_semana",
                entradaPago: 170,
                saidaPago: 80,
                entradaAVencer: 50,
                saidaAVencer: 20,
                entradaAtrasado: 10,
                saidaAtrasado: 5
            }
        }
    },
    "GET /api/dashboard/fluxo-pago": {
        sent: { meses: 6, tipo: "entrada" },
        response: {
            data: {
                meses: 6,
                tipo: "entrada",
                items: [{ date: "2026-03-01T03:00:00.000Z", value: 170 }]
            }
        }
    },
    "GET /api/dashboard/os-status": {
        sent: { periodo: "esta_semana" },
        response: {
            data: {
                periodo: "esta_semana",
                items: [
                    { group: "aberta", value: 1 },
                    { group: "concluída", value: 0 }
                ]
            }
        }
    },
    "GET /api/dashboard/os-pagamento": {
        sent: { periodo: "esta_semana" },
        response: {
            data: {
                periodo: "esta_semana",
                items: [
                    { group: "Não pago", value: 2 },
                    { group: "Pago", value: 1 }
                ]
            }
        }
    },
    "GET /api/dashboard/os-reabertas": {
        sent: { periodo: "esta_semana" },
        response: {
            data: {
                periodo: "esta_semana",
                items: [{ group: "01/10", value: 1, id: "2026-10-01" }]
            }
        }
    },
    "GET /api/dashboard/os-reabertas/list": {
        sent: { periodo: "esta_semana", bucket: "2026-10-01", page: 1 },
        response: {
            data: {
                items: [
                    {
                        id: 1,
                        clienteNome: "Cliente OS",
                        veiculoLabel: "Civic · CIV1A23",
                        responsaveis: ["Mecânico"]
                    }
                ],
                total: 1,
                page: 1,
                limit: 10
            }
        }
    }
};

export function routeExample(method: string, routePath: string): Example {
    const normalized = `${method} ${routePath}`;
    const found = examples[normalized];

    if (found) {
        return found;
    }

    if (method === "GET" && !routePath.includes(":")) {
        return { sent: {}, response: { data: [], ...listMeta, total: 0 } };
    }

    if (method === "GET") {
        return { sent: {}, response: { data: {} } };
    }

    if (method === "DELETE") {
        return { sent: {}, response: {} };
    }

    if (method === "POST") {
        return { sent: {}, response: { data: {} } };
    }

    return { sent: {}, response: { data: {} } };
}
