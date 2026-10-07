# Empresa

Cada banco de dados tem **uma** empresa: a oficina. Ela guarda só o nome.

| Item | Arquivo |
| --- | --- |
| Rotas | `src/routes/empresaRoutes.ts` |
| Controller | `src/controllers/empresaController.ts` |
| Serviço | `src/services/empresaService.ts` |

Exemplos: [`routes/_empresa.md`](../routes/_empresa.md).

A empresa é criada no [cadastro da oficina](./autenticacao.md#post-apicadastro), não por esta rota.

## Rotas

| Método e caminho | Quem pode | O que faz |
| --- | --- | --- |
| `GET /api/empresa` | qualquer usuário autenticado | A empresa do usuário logado. |
| `GET /api/empresa/:id` | qualquer usuário autenticado | A empresa pelo id. Só funciona com o id da própria empresa; outro id responde 404. |
| `PUT` / `PATCH /api/empresa/:id` | só superadmin | Altera o `nome`. |

Na atualização, `validateEmpresa` exige `nome` no `PUT` (opcional no `PATCH`) com no máximo o tamanho permitido. Um id que não é o da empresa do usuário responde 404, e quem não é superadmin responde 403.

O frontend usa `GET /api/empresa` logo depois do login para mostrar o nome da oficina na barra lateral.

A empresa não registra auditoria nem avisa em tempo real.
