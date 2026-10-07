# Documentação do backend Mecarvit

Tudo aqui descreve **este repositório**. Quando algo depende de outro (por exemplo, as regras de permissão do `cht-shared`), há só uma menção. Comece pela [visão geral](./visao-geral.md).

## Arquitetura e infraestrutura

| Página | Assunto |
| --- | --- |
| [Visão geral](./visao-geral.md) | Camadas, ciclo da requisição e mapa do código. |
| [Configuração](./configuracao.md) | Variáveis de ambiente, subida do servidor e montagem do app. |
| [Banco de dados](./banco-de-dados.md) | Um SQLite por oficina, tabelas e migrações. |
| [Autenticação e acesso](./autenticacao-e-acesso.md) | Sessão por cookie, permissões e guardas de rota. |
| [Middlewares](./middlewares.md) | Sanitização, autenticação, acesso, erros e log. |
| [Utilitários](./utilitarios.md) | `ApiFeatures`, erros, JWT, cookie, datas e helpers do corpo da requisição. |
| [Tempo real](./tempo-real.md) | WebSocket e notificações ao superadmin. |
| [Ferramentas de desenvolvimento](./ferramentas-de-desenvolvimento.md) | Scripts, dados mock, reset e REPL. |
| [Testes](./testes.md) | Vitest, isolamento e cobertura. |

## Recursos (rota, controller e serviço)

| Página | Caminho base |
| --- | --- |
| [Autenticação e cadastro da oficina](./entidades/autenticacao.md) | `/api/cadastro`, `/api/login`, `/api/logout`, `/api/me` |
| [Funcionários](./entidades/funcionarios.md) | `/api/usuario` |
| [Cargos](./entidades/cargos.md) | `/api/cargo` |
| [Empresa](./entidades/empresa.md) | `/api/empresa` |
| [Clientes](./entidades/clientes.md) | `/api/cliente` |
| [Endereços](./entidades/enderecos.md) | `/api/endereco` |
| [Veículos](./entidades/veiculos.md) | `/api/veiculo` |
| [Serviços](./entidades/servicos.md) | `/api/servico` |
| [Ordens de serviço](./entidades/ordens-de-servico.md) | `/api/ordem-servico`, `/api/status-os` |
| [Registros de entrada e saída](./entidades/registros-financeiros.md) | `/api/regentradasaida` |
| [Dashboard](./entidades/dashboard.md) | `/api/dashboard` |
| [Logs de auditoria](./entidades/logs-de-auditoria.md) | `/api/audit-logs` |

## Guias e exemplos

| Arquivo | Conteúdo |
| --- | --- |
| [getting-started.md](./getting-started.md) | Subir o backend com dados de demonstração. |
| [howto-create-new-route.md](./howto-create-new-route.md) | Como adicionar uma rota. |
| [howto-create-new-entity.md](./howto-create-new-entity.md) | Como adicionar uma entidade. |
| [routes/](./routes/) | Exemplo de requisição e resposta de cada rota (gerado por `npm run docs:routes`; não edite à mão). |
