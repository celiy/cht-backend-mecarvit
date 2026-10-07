# Banco de dados

SQLite (`better-sqlite3`) acessado pelo **Drizzle ORM**. O código está em `src/config/database.ts` (conexões) e `src/db/` (schema, migrações, mock e reset).

## Um arquivo por oficina

Cada empresa tem o próprio banco: `EMPRESAS_DIR/{empresaId}.sqlite` (padrão `./data/empresas`). O id da empresa vem do nome do arquivo e é o `empresaId` que vai dentro do token.

`config/database.ts` mantém um **pool** de conexões abertas, uma por empresa:

| Função | O que faz |
| --- | --- |
| `openCompany(empresaId)` | Abre (ou reaproveita) o banco da empresa e aplica as migrações pendentes. Se o arquivo foi trocado no disco, descarta a conexão antiga. Lança erro se o arquivo não existe. |
| `createCompanyDatabase(nome)` | Escolhe o próximo id livre, cria o arquivo, aplica as migrações e executa `seedCompany`. |
| `seedCompany` | Cria a empresa, o cargo **Superadmin**, os cargos **Gerente** e **Mecânico** e os sete status de OS. Se o banco já tinha cargos, converte o `nivelAcesso` antigo para o formato atual. |
| `empresaExists`, `listLocalEmpresaIds`, `listLocalEmpresas` | Descobrem as oficinas que existem no disco. |
| `runMigrations()` | Abre todas as empresas existentes, o que aplica as migrações. Roda na subida do servidor. |
| `removeCompanyFiles(empresaId)` | Apaga o `.sqlite` (e `-wal`, `-shm`, `-journal`) e a pasta de logs da empresa. |
| `closeCompany`, `closeAllCompanies`, `closeDatabase` | Fecham conexões. |
| `resetAllData()` | Apaga todos os `.sqlite` de `EMPRESAS_DIR` e o arquivo antigo `DB_PATH`. |

Cada conexão usa `journal_mode = WAL` e `foreign_keys = ON`.

Como cada requisição abre o banco da empresa do token (`protect` coloca em `req.db`), um funcionário só enxerga dados da própria oficina.

## Tabelas

Definidas em `src/db/schema/tables.ts`. Toda tabela tem `mock` (booleano, para os [dados de demonstração](./ferramentas-de-desenvolvimento.md)) e as que registram histórico têm `criadoEm` e `modificadoEm`, atualizados automaticamente.

| Tabela | Chave | Conteúdo |
| --- | --- | --- |
| `empresa` | `id` | Nome da oficina. |
| `cargo` | `id` | Nome e `nivel_acesso` (lista JSON de chaves de permissão). |
| `usuario` | `cpf` | Funcionário: nome, e-mail (único), hash da senha, `ativo`, `senha_inicial`, `fundador`, cargo e empresa. |
| `endereco` | `id` | Estado, cidade, CEP, bairro, rua, número, complemento. |
| `cliente` | `documento` | CPF ou CNPJ, nome, nome social, celular, e-mail (único), observação, `ativo`, usuário que cadastrou. |
| `endereco_cliente` | `(cliente_documento, endereco_id)` | Liga clientes a endereços (muitos-para-muitos). |
| `veiculo` | `id` | Modelo, placa, tipo, quilometragem, data da troca de óleo, chassi (único), `ativo`, cliente dono. |
| `servico` | `id` | Catálogo de serviços (só o nome). |
| `status_os` | `id` | Status possíveis de uma OS (nome único). |
| `ordem_servico` | `id` | OS: cliente, veículo, status, datas, diagnósticos, observação, prazo de pagamento e o registro financeiro gerado. |
| `item_servico` | `id` | Itens da OS: serviço, quantidade e valor. |
| `responsavel` | `(usuario_cpf, ordem_servico_id)` | Funcionários responsáveis pela OS. |
| `reg_entrada_saida` | `id` | Lançamento financeiro: nome, descrição, tipo (`entrada` ou `saida`), valor, prazo de pagamento. |
| `pagamento` | `id` | Pagamentos de um lançamento: tipo e valor. |
| `os_reabertura` | `id` | Histórico de reaberturas de OS, com os responsáveis no momento (JSON). |

Relações que importam:

- Uma OS **gera** um registro de entrada: `ordem_servico.reg_entrada_saida_id` aponta (único) para `reg_entrada_saida`. Ver [ordens de serviço](./entidades/ordens-de-servico.md).
- Itens, responsáveis e reaberturas somem junto com a OS (`ON DELETE CASCADE`). Pagamentos somem junto com o lançamento.
- Os status são constantes: `STATUS_OS` em `tables.ts` (1 aberta, 2 pendente, 3 em andamento, 4 concluída, 5 cancelada, 6 orçamento, 7 reaberta). São os mesmos ids de `OS_STATUS` no `cht-shared`.

## Migrações

Ficam em `src/db/migrations/` e são aplicadas pelo `drizzle-orm/migrator` sempre que uma conexão é aberta. Histórico:

| Migração | O que muda |
| --- | --- |
| `0000_…` | Esquema inicial. |
| `0001_…` | Acrescenta a coluna `mock` às tabelas. |
| `0002_…` | Acrescenta `data_limite_pagamento` à OS. |
| `0003_item_servico_id` | Reestrutura `item_servico` (serviço por id, valores de peças e de obra). |
| `0004_item_valor_orcamento` | `item_servico` passa a ter um único `valor`. |
| `0005_os_reabertura` | Cria o status `reaberta` e a tabela `os_reabertura`. |

Para gerar uma nova migração depois de mudar o schema: `npm run db:generate`. Para aplicar sem subir a API: `npm run db:migrate`.
