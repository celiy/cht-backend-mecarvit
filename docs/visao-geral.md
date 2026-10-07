# Visão geral

O backend do Mecarvit é uma API REST em **Node.js + Express + TypeScript**, com **SQLite** via **Drizzle ORM**. Ele atende o frontend [cht-client-mecarvit](https://github.com/celiy/cht-client-mecarvit) e roda também embutido no app desktop (Electron) do `cht-base`.

## Ideias centrais

- **Uma oficina, um arquivo SQLite.** Cada empresa (oficina) tem o próprio banco em `data/empresas/{id}.sqlite`. Não há banco único com coluna de tenant. Ver [banco de dados](./banco-de-dados.md).
- **Camadas fixas.** Cada recurso segue `rota → controller → serviço → banco`. A rota só liga o caminho aos guardas de acesso; o controller valida a entrada e monta a resposta; o serviço concentra as regras de negócio.
- **JSON em português.** Caminhos, campos e mensagens usam português: `/api/ordem-servico`, `cpf`, `nome`, `senha`, `criadoEm`.
- **Validação compartilhada.** Os validadores vêm do `cht-shared` (`@shared/validators/mecarvit`), os mesmos que o frontend usa antes de enviar.
- **Permissões por chave nomeada.** O cargo guarda uma lista de chaves como `clientes.editar` ou `os.pagamentos`. Ver [autenticação e acesso](./autenticacao-e-acesso.md).

## Ciclo de uma requisição

1. `helmet`, `cookie-parser`, `express.json` (limite de 1 MB), `hpp` e `cors` (com cookies habilitados).
2. [`requestContext`](./middlewares.md) marca a hora da requisição e [`sanitize`](./middlewares.md) limpa XSS de `body`, `query` e `params`.
3. `GET /health` responde antes de qualquer autenticação.
4. [`actionLogger`](./middlewares.md) imprime uma linha colorida no terminal.
5. `/api`: rotas públicas (`cadastro`, `login`, `logout`, `empresa-locais`) e, depois, o roteador privado, que exige `protect` e `requirePasswordChanged`.
6. O guarda de acesso da rota (`requireAccess` ou `requireGerente`) confere o cargo.
7. O controller valida o corpo, chama o serviço e registra [auditoria](./entidades/logs-de-auditoria.md) nas operações de escrita.
8. Qualquer erro cai em `globalErrorHandler`, que devolve o formato de erro compartilhado (`{ status, error: { message, fields } }`).

## Mapa do código (`src/`)

| Pasta | Papel |
| --- | --- |
| `server.ts`, `app.ts` | Subida do servidor e montagem do Express. |
| `config/` | Variáveis de ambiente e pool de bancos por empresa. |
| `routes/` | Um roteador por recurso. `routes/index.ts` junta tudo. |
| `controllers/` | Entrada e saída HTTP de cada recurso. |
| `services/` | Regras de negócio e acesso ao banco. |
| `middlewares/` | Autenticação, acesso, sanitização, erro, log. |
| `db/` | Schema Drizzle, migrações, `mock` (dados de demonstração) e `reset`. |
| `realtime/` | Servidor WebSocket e notificações. |
| `repl/` | Console de desenvolvimento e gerador da documentação de rotas. |
| `utils/` | Pequenos helpers: erros, JWT, cookie, paginação/filtro, datas. Ver [utilitários](./utilitarios.md). |
| `entities/`, `types/` | Tipos do usuário público e extensão do `Request`. |

## Recursos

Cada recurso tem uma página com rotas, permissões, regras e erros:

| Recurso | Caminho base |
| --- | --- |
| [Autenticação e cadastro da oficina](./entidades/autenticacao.md) | `/api/cadastro`, `/api/login`, `/api/logout`, `/api/me`, `/api/empresa-locais` |
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

## Outros assuntos

- [Configuração e variáveis de ambiente](./configuracao.md)
- [Banco de dados, migrações e dados de demonstração](./banco-de-dados.md)
- [Autenticação, cookie e permissões](./autenticacao-e-acesso.md)
- [Middlewares](./middlewares.md)
- [Utilitários](./utilitarios.md)
- [Tempo real (WebSocket)](./tempo-real.md)
- [Ferramentas de desenvolvimento](./ferramentas-de-desenvolvimento.md)
- [Testes](./testes.md)
- Guias já existentes: [primeiros passos](./getting-started.md), [criar uma rota](./howto-create-new-route.md), [criar uma entidade](./howto-create-new-entity.md) e os exemplos de requisição e resposta em [`routes/`](./routes/).
