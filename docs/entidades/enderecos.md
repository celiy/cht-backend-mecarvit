# Endereços

Endereços são cadastros próprios, ligados a clientes por uma tabela de ligação (`endereco_cliente`). Dois clientes podem compartilhar o mesmo endereço.

| Item | Arquivo |
| --- | --- |
| Rotas | `src/routes/enderecoRoutes.ts` |
| Controller | `src/controllers/enderecoController.ts` |
| Serviço | `src/services/enderecoService.ts` |
| Normalização | `src/utils/enderecoNormalize.ts` |

## Rotas

Todas exigem `clientes.editar`.

| Método e caminho | O que faz |
| --- | --- |
| `GET /api/endereco` | Lista com filtros e paginação (por exemplo `rua=…`, usado na busca do formulário de cliente). |
| `POST /api/endereco` | Cria. Status 201. |
| `GET /api/endereco/:id` | Detalhe. |
| `PUT /api/endereco/:id` | Substitui os campos. Não há `PATCH` nem `DELETE`. |

## Campos

`estado`, `cidade`, `cep`, `bairro` e `rua` são obrigatórios; `numero` é inteiro maior ou igual a zero; `complemento` é opcional (texto, guardado como string vazia se faltar). `validateEndereco` cuida disso.

## Normalização e duplicidade

Antes de gravar ou comparar, o serviço normaliza: `estado` em maiúsculas, `cep` só com dígitos e os textos sem espaços nas pontas. Dois endereços com todos os campos iguais depois disso são o mesmo.

- Criar ou atualizar um endereço que já existe responde 409 `Este endereço já está cadastrado`, com o `enderecoId` do existente em `fields`.
- `findOrCreateEndereco` (usado ao cadastrar um cliente com `enderecos`) devolve o id do idêntico ou cria um novo.

Criar avisa o superadmin em [tempo real](../tempo-real.md) quando quem cria não é superadmin. Endereços não geram auditoria.
