# Autenticação e acesso

## Sessão

1. `POST /api/cadastro` (nova oficina) ou `POST /api/login` devolve `{ data: { token, usuario, empresa, precisaTrocarSenha } }` **e** grava o token no cookie `cht_auth`.
2. O frontend não guarda o token: usa só o cookie. `GET /api/me` devolve o usuário logado.
3. `POST /api/logout` apaga o cookie (204).

O token é um JWT com `{ sub: cpf, email, empresaId }`, assinado com `JWT_SECRET` e válido por `JWT_EXPIRES_IN`.

### Cookie (`utils/authCookie.ts`)

Nome `cht_auth`, `httpOnly`, `secure`, `sameSite: none`, `path: /`. A duração segue `JWT_EXPIRES_IN`. `readAuthToken` procura o token, nesta ordem: no cookie já interpretado, no cabeçalho `Cookie` e, por último, em `Authorization: Bearer …`.

### `protect`

`middlewares/protect.ts`, aplicado a todo o roteador privado:

1. Lê o token. Sem token, 401 `Não autenticado`.
2. Valida o JWT. Inválido ou expirado: apaga o cookie e responde 401.
3. Confere que o arquivo da empresa ainda existe.
4. Abre o banco da empresa e busca o usuário pelo CPF. Inexistente ou inativo: apaga o cookie e responde 401.
5. Preenche `req.user`, `req.empresaId` e `req.db`.

### Login com várias oficinas

O mesmo e-mail pode existir em mais de uma oficina. Sem `empresaId`, o `login` procura em todas as oficinas locais. Se achar uma só, entra. Se achar várias, responde 400 `Selecione a empresa para continuar` com a lista em `error.empresas`, e o frontend pede para escolher e enviar de novo com `empresaId`.

### Senha inicial

Funcionários criados por um gerente nascem com `senhaInicial = true`. O middleware `requirePasswordChanged` deixa passar só `GET` e o `POST /api/usuario/:cpf/senha`; qualquer outra escrita responde 403 até a senha ser trocada.

## Permissões

O cargo (`cargo.nivel_acesso`) guarda uma lista JSON de chaves, definidas em `@shared/mecarvit/access`:

| Área | Chaves |
| --- | --- |
| `funcionarios` | `ver`, `editar`, `criar`, `excluir`, `exportar`, `pii` |
| `clientes` | `ver`, `editar`, `criar`, `excluir`, `exportar`, `pii` |
| `veiculos` | `ver`, `editar`, `criar`, `excluir`, `exportar` |
| `os` | `ver`, `editar`, `criar`, `excluir`, `exportar`, `diagnostico.editar`, `pagamentos` |
| `financeiro` | `ver`, `editar`, `criar`, `excluir`, `exportar` |
| Especiais | `superadmin` (passa por tudo) e `gerente` |

Pontos de atenção:

- **`ver` não abre a página da área.** As rotas de escrita e as páginas exigem `editar` (alias em `ACCESS`, por exemplo `ACCESS.CLIENTES = clientes.editar`). A chave `ver` serve para enxergar dados em contexto (por exemplo, o nome do cliente em uma OS).
- **`pii`** libera dados pessoais sensíveis (CPF e CNPJ completos, celular). Sem ela, a resposta da OS esconde o documento e o celular do cliente.
- **`gerente`** é uma chave que libera dashboard e gestão de cargos. Quem tem `superadmin` também conta como gerente.
- Cargos pré-configurados criados em toda oficina: **Superadmin** (o do fundador), **Gerente** e **Mecânico** (vê e edita OS, edita diagnóstico, só visualiza funcionários, clientes, veículos e financeiro).

### Guardas de rota

| Middleware | Uso |
| --- | --- |
| `requireAccess(chave)` | Exige que o cargo tenha a chave (`hasAccess`). 403 `Permissão insuficiente` se não tiver. |
| `requireGerente` | Exige gerente ou superadmin (dashboard). |
| `requirePasswordChanged` | Bloqueia escritas com senha inicial. |

Algumas rotas fazem a checagem dentro do controller, porque dependem de quem é o alvo (por exemplo, `PUT /api/usuario/:cpf` aceita o próprio usuário). Cada [recurso](./visao-geral.md#recursos) lista suas permissões.

### Regras do superadmin e do fundador

- O **fundador** é o usuário criado no cadastro da oficina (`fundador = true`, cargo Superadmin). Não pode ser inativado nem perder o cargo de superadmin.
- Não existe um segundo cargo superadmin: nem criar, nem promover um cargo a esse nível, nem atribuí-lo a outro usuário.
- Só o superadmin redefine a senha de outro funcionário e altera os cargos pré-configurados.
