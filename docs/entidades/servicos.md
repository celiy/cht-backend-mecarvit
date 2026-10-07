# Serviços

O catálogo de serviços é só uma lista de nomes (`servico`). Os itens de uma OS apontam para ele.

| Item | Arquivo |
| --- | --- |
| Rotas | `src/routes/servicoRoutes.ts` |
| Controller | `src/controllers/servicoController.ts` |
| Serviço | `src/services/servicoService.ts` |

## Rotas

| Método e caminho | Permissão | O que faz |
| --- | --- | --- |
| `GET /api/servico` | `os.ver` | Lista com filtros e paginação (o frontend busca por `nome` para sugerir serviços). |
| `POST /api/servico` | `os.editar` | Cria. Status 201. |
| `GET /api/servico/:id` | `os.ver` | Detalhe. |
| `PUT` / `PATCH /api/servico/:id` | `os.editar` | Renomeia. |
| `DELETE /api/servico/:id` | `os.excluir` | Exclui. Status 204. |

## Regras

- `nome` é obrigatório (`validateServico`).
- **Criação implícita.** Ao salvar uma OS com um item que traz `servicoNome` sem `servicoId`, `findOrCreateServicoByNome` procura um serviço com o mesmo nome (sem diferenciar maiúsculas) e, se não existir, cria. É assim que o frontend cria serviços novos digitando.
- Um serviço usado por algum item de OS **não pode** ser excluído: 409 `Serviço em uso em ordem de serviço`.

## Auditoria e tempo real

Criar, alterar e excluir registram `servico` na [auditoria](./logs-de-auditoria.md). Criar avisa o superadmin quando quem cria não é superadmin.
