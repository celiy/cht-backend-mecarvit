# Autenticação e cadastro da oficina

| Item | Arquivo |
| --- | --- |
| Rotas | `src/routes/index.ts` |
| Controller | `src/controllers/authController.ts` |
| Serviço | `src/services/authService.ts` |

Conceitos de sessão, cookie e permissões estão em [autenticação e acesso](../autenticacao-e-acesso.md). Esta página descreve só as rotas.

## Rotas

| Método e caminho | Acesso | O que faz |
| --- | --- | --- |
| `POST /api/cadastro` | público | Cria uma oficina nova e o usuário fundador. Status 201. |
| `POST /api/login` | público | Entra com e-mail e senha. Status 200. |
| `POST /api/logout` | público | Apaga o cookie `cht_auth`. Status 204. |
| `GET /api/empresa-locais` | público | Lista as oficinas que existem neste computador (`id` e `nome`). |
| `GET /api/me` | autenticado | Devolve o usuário logado. |

Exemplos de corpo e resposta: [`routes/_cadastro.md`](../routes/_cadastro.md), [`_login.md`](../routes/_login.md), [`_me.md`](../routes/_me.md), [`_empresa-locais.md`](../routes/_empresa-locais.md).

## `POST /api/cadastro`

Corpo:

```json
{
  "empresa": { "nome": "Oficina do Zé" },
  "usuario": { "cpf": "39053344705", "nome": "Ana Gestora", "email": "ana@oficina.test", "senha": "SenhaForte1" }
}
```

O controller valida com `validateCadastro` e chama `authService.cadastrarEmpresa`, que:

1. Cria o banco da oficina (`createCompanyDatabase`), com os cargos e status padrão.
2. Cria o usuário com cargo `1` (Superadmin), `fundador = true` e `senhaInicial = false`.
3. Gera o token e devolve `{ token, usuario, empresa: { id, nome }, precisaTrocarSenha: false }`.
4. Se a criação do usuário falhar (CPF ou e-mail inválido ou duplicado, por exemplo), apaga o banco recém-criado.

O token também vai no cookie `cht_auth`.

## `POST /api/login`

Corpo: `{ email, senha, empresaId? }` (`password` é aceito no lugar de `senha`). O e-mail é comparado em minúsculas e a senha com `bcrypt`.

- Com `empresaId`: procura só naquela oficina. Oficina inexistente: 404.
- Sem `empresaId`: procura em todas. Uma correspondência: entra. Várias: 400 com `error.empresas` (lista de oficinas para escolher).
- Credenciais erradas: 401 `Credenciais inválidas`. Usuário inativo na oficina informada: 403 `Usuário inativo`.

Resposta: `{ data: { token, usuario, empresa: { id }, precisaTrocarSenha } }`, onde `precisaTrocarSenha` é `true` quando o funcionário ainda usa a senha inicial.

## `POST /api/logout`

Só apaga o cookie. O token em si continua válido até expirar, porque é sem estado: quem o guardar fora do cookie ainda consegue usá-lo.
