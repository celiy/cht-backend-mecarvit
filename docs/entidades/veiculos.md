# Veículos

Cada veículo pertence a **um cliente** (`clienteDocumento`).

| Item | Arquivo |
| --- | --- |
| Rotas | `src/routes/veiculoRoutes.ts` |
| Controller | `src/controllers/veiculoController.ts` |
| Serviço | `src/services/veiculoService.ts` |

Exemplos: [`routes/_veiculo.md`](../routes/_veiculo.md).

## Rotas

| Método e caminho | Permissão | O que faz |
| --- | --- | --- |
| `GET /api/veiculo` | `veiculos.ver` | Lista com filtros e paginação. Aceita ordenar por `clienteNome`. |
| `POST /api/veiculo` | `veiculos.criar` | Cria. Status 201. |
| `GET /api/veiculo/:id` | `veiculos.ver` | Detalhe, com o cliente e as ordens de serviço do veículo. |
| `PUT` / `PATCH /api/veiculo/:id` | `veiculos.editar` | Atualiza. |
| `DELETE /api/veiculo/:id` | `veiculos.excluir` | Exclui. Status 204. |

## Campos

| Campo | Regra |
| --- | --- |
| `modelo`, `placa` | Obrigatórios na criação. A placa é gravada em maiúsculas. |
| `clienteDocumento` | Obrigatório na criação; o cliente precisa existir (404 `Cliente não encontrado`). |
| `tipo` | Opcional, texto livre (o frontend oferece uma lista, mas o valor é livre). |
| `kilometragem` | Número maior ou igual a zero. |
| `dataTrocaOleo` | Data. |
| `chassi` | Opcional e **único** (409 `Chassi já cadastrado`). |
| `ativo` | Só na atualização. |

No `PATCH`, os campos enviados mudam e os demais ficam. No `PUT`, `modelo` e `placa` continuam obrigatórios. Em ambos, `null` limpa `tipo`, `kilometragem`, `dataTrocaOleo` e `chassi`. Trocar `clienteDocumento` transfere o veículo para outro cliente existente.

## Exclusão

Um veículo ligado a qualquer ordem de serviço **não pode** ser excluído: 409 `Veículo ligado a ordem de serviço não pode ser excluído`. Nesse caso, inative-o.

## Auditoria e tempo real

Criar, alterar e excluir registram `veiculo` na [auditoria](./logs-de-auditoria.md). Criar avisa o superadmin quando quem cria não é superadmin.
