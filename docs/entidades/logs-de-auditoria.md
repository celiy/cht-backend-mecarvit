# Logs de auditoria

Registro do que cada usuário criou, alterou e excluiu. Fica em **arquivos JSON**, fora do SQLite.

| Item | Arquivo |
| --- | --- |
| Rotas | `src/routes/auditLogRoutes.ts` |
| Controller | `src/controllers/auditLogController.ts` |
| Serviço | `src/services/auditLogService.ts` |
| Gravação a partir do controller | `src/utils/audit.ts` (`recordAudit`) |
| Limpeza agendada | `src/utils/schedules.ts` |

## Rotas

Exigem **superadmin**.

| Método e caminho | O que faz |
| --- | --- |
| `GET /api/audit-logs` | Lista entradas com filtros e paginação. Responde `{ data, total, page, limit }`. |
| `GET /api/audit-logs/:id` | Uma entrada. O parâmetro opcional `occurredAt` acelera a busca. 404 se não existir. |

### Filtros da lista

| Parâmetro | Efeito |
| --- | --- |
| `action` | `create`, `update` ou `delete` (igualdade). |
| `entity` | Entidade registrada (igualdade). |
| `actor` | Texto parcial no CPF, nome, e-mail ou tipo do autor. |
| `from`, `to` | Dias (`aaaa-mm-dd`, UTC). Sem eles, os **últimos 30 dias**. |
| `q` | Texto parcial em qualquer parte da entrada. |
| `sort` | Campos separados por vírgula; `-` inverte. Padrão: mais recentes primeiro. |
| `page`, `limit` | Página e tamanho (padrão 20, máximo 100). |

## Onde ficam os arquivos

```
EMPRESAS_DIR/{empresaId}/logs/{MM_AAAA}/{dia}.json
```

Um arquivo por dia (em UTC), com uma lista de entradas. Ao gravar, o serviço lê o arquivo do dia, acrescenta e reescreve. A listagem percorre os dias do intervalo pedido e filtra em memória.

## Formato de uma entrada

| Campo | Conteúdo |
| --- | --- |
| `id` | UUID. |
| `schemaVersion` | Versão do formato (hoje `1`). |
| `occurredAt` | Momento, em ISO. |
| `actor` | `{ type: "user" \| "system", id, name?, email? }`. O `id` é o CPF, ou `sistema`. |
| `action` | `create`, `update` ou `delete`. |
| `entity`, `entityId` | O que foi alterado. |
| `result` | `success` ou `failure`. |
| `before`, `after` | Estado antes e depois. |
| `changes` | Lista `{ field, before, after }` com os campos que mudaram. |
| `request` | Método, caminho, IP, `User-Agent` e hora da requisição. |

### Dados sensíveis

Antes de gravar, qualquer chave que lembre `senha`, `password`, `token`, `secret`, `hash`, `authorization`, `cookie` ou `jwt` é trocada por `[redacted]`, em qualquer nível do objeto.

## O que gera registro

Os controllers chamam `recordAudit` depois de uma escrita bem-sucedida:

| Entidade registrada | Quando |
| --- | --- |
| `funcionario` | Criar e atualizar. |
| `cargo` | Criar, atualizar e excluir. |
| `cliente` | Criar, atualizar e excluir. |
| `veiculo` | Criar, atualizar e excluir. |
| `servico` | Criar, atualizar e excluir. |
| `ordem-servico` | Criar, atualizar e excluir. |
| `reg-entrada-saida` | Criar, atualizar e excluir. |

Endereços, empresa e troca de senha não geram registro. Na tela de logs do frontend, o filtro de entidade oferece cliente, funcionário, cargo, veículo, serviço e ordem de serviço.

## Retenção

Todo dia às **03:00 UTC** (`node-cron`), `purgeAllEmpresasAuditLogs` apaga as **pastas de mês** com mais de **6 meses** (`AUDIT_RETENTION_MONTHS`). A limpeza é por mês inteiro, então um mês só some quando todo ele passou do limite. Excluir uma oficina (`removeCompanyFiles`) também apaga a pasta `logs`.
