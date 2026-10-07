# Clientes

Cliente é quem leva o veículo à oficina. A chave é o **documento** (CPF ou CNPJ, só dígitos).

| Item | Arquivo |
| --- | --- |
| Rotas | `src/routes/clienteRoutes.ts` |
| Controller | `src/controllers/clienteController.ts` |
| Serviço | `src/services/clienteService.ts` |

Exemplos: [`routes/_cliente.md`](../routes/_cliente.md).

## Rotas

| Método e caminho | Permissão | O que faz |
| --- | --- | --- |
| `GET /api/cliente` | `clientes.ver` | Lista com filtros e paginação. Esconde inativos por padrão. |
| `POST /api/cliente` | `clientes.criar` | Cria. Status 201. |
| `GET /api/cliente/:documento` | `clientes.ver` | Detalhe. |
| `PUT` / `PATCH /api/cliente/:documento` | `clientes.editar` | Atualiza. |
| `DELETE /api/cliente/:documento` | `clientes.excluir` | Exclui (ver as regras). Status 204. |

## O que o detalhe devolve

`getClienteDetalhe` devolve o cliente com três listas aninhadas: `enderecos`, `veiculos` e `ordensServico`. Tanto a lista quanto o detalhe usam esse formato.

## Criação

Obrigatórios: `documento` (CPF ou CNPJ válido) e `nome`. Opcionais: `nomeSocial`, `cel` (`telefone` também é aceito; grava só dígitos), `email` (único, em minúsculas), `obs`, `ativo`.

O corpo pode trazer, juntos:

- `enderecoIds`: ids de endereços que já existem.
- `enderecos`: endereços novos (o serviço reaproveita um idêntico que já exista ou cria).
- `veiculos`: veículos novos, criados já ligados ao cliente.

Repetir o mesmo endereço no cliente é erro 400. O `usuarioCpf` do cliente é quem o cadastrou.

## Atualização

- `PUT` e `PATCH` se comportam igual (só o que for enviado muda), e o `PUT` não zera o que faltou.
- `enderecoIds` ou `enderecos`: quando enviados, **substituem** a lista de endereços do cliente. Quem quiser manter os atuais deve reenviá-los.
- `nome`, `nomeSocial`, `cel`, `email`, `obs`, `ativo` mudam só quando enviados; `null` ou texto vazio limpa o campo.
- Enviar `veiculos` **substitui** todos os veículos do cliente. Se algum já está em uma ordem de serviço, 409 `Não é possível substituir veículos ligados a ordens de serviço`.

## Exclusão

Um cliente com histórico (qualquer OS, veículo com OS, ou item de serviço) **não pode** ser excluído: 409 `Cliente possui histórico operacional e não pode ser excluído`, com a dica de inativá-lo (`ativo: false`). Sem histórico, o serviço apaga os veículos, desfaz as ligações de endereço e remove o cliente.

## Dados sensíveis

O frontend esconde CPF/CNPJ e celular de quem não tem `clientes.pii`. No backend essa proteção está nas respostas de [ordens de serviço](./ordens-de-servico.md) (`presentOrdemServico`); a lista e o detalhe do cliente trazem o documento, que é a chave do recurso.

## Auditoria e tempo real

Criar, alterar e excluir registram `cliente` na [auditoria](./logs-de-auditoria.md). Criar avisa o superadmin quando quem cria não é superadmin.
