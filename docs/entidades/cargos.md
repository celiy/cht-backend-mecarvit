# Cargos

Um cargo é um nome mais a lista de permissões que ele concede (`nivel_acesso`, um JSON com chaves como `clientes.editar`). Ver [as chaves](../autenticacao-e-acesso.md#permissões).

| Item | Arquivo |
| --- | --- |
| Rotas | `src/routes/cargoRoutes.ts` |
| Controller | `src/controllers/cargoController.ts` |
| Serviço | `src/services/cargoService.ts` |

Exemplos: [`routes/_cargo.md`](../routes/_cargo.md).

## Rotas

Todas exigem `funcionarios.editar` na rota. Além disso, o **serviço** só aceita criar, alterar e excluir de **gerente ou superadmin**.

| Método e caminho | O que faz |
| --- | --- |
| `GET /api/cargo` | Lista com filtros e paginação. |
| `POST /api/cargo` | Cria. Corpo: `nome` e `nivelAcesso`. Status 201. |
| `GET /api/cargo/:id` | Detalhe. |
| `PUT` / `PATCH /api/cargo/:id` | Atualiza `nome` e/ou `nivelAcesso`. |
| `DELETE /api/cargo/:id` | Exclui. Status 204. |

## Regras

- **Superadmin é exclusivo do fundador.** Não se cria outro cargo com a chave `superadmin`, não se promove um cargo a ele e o cargo Superadmin não perde o nível nem pode ser excluído.
- **Cargos pré-configurados** (`Gerente` e `Mecânico`) só podem ser alterados ou excluídos pelo superadmin.
- **Quem gerencia funcionários precisa ser gerente.** Um cargo comum não pode receber permissões de escrita em `funcionarios` (só `funcionarios.ver`), porque isso daria a ele poderes de gerente (400). Essa checagem vale para quem não é superadmin.
- **Cargo em uso não se exclui.** Se há funcionários nele, 409 `Cargo em uso por funcionários`.
- O `nivelAcesso` é normalizado: aceita lista de chaves ou o formato antigo de dígitos, e é gravado como JSON ordenado e sem repetições.
- O tipo do `nivelAcesso` é validado por `validateCargo` (chaves conhecidas, não vazio).

## Auditoria e tempo real

Criar, alterar e excluir registram `cargo` na [auditoria](./logs-de-auditoria.md). Criar avisa o superadmin em [tempo real](../tempo-real.md) quando quem cria não é superadmin.
