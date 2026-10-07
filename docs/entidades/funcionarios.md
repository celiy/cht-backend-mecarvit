# Funcionários

Funcionários são a tabela `usuario` (a oficina é identificada pelo banco, e não por uma coluna).

| Item | Arquivo |
| --- | --- |
| Rotas | `src/routes/usuarioRoutes.ts` |
| Controller | `src/controllers/usuarioController.ts` |
| Serviço | `src/services/usuarioService.ts` |
| Tipos | `src/entities/Usuario.ts` (`PublicUsuario` sem a senha, `AuthUsuario` com ela) |

Exemplos de requisição e resposta: [`routes/_usuario.md`](../routes/_usuario.md).

## Rotas

| Método e caminho | Quem pode | O que faz |
| --- | --- | --- |
| `GET /api/usuario` | `funcionarios.editar` | Lista com filtros, ordenação e paginação (ver [`ApiFeatures`](../utilitarios.md#listagem-apifeatures)). Não inclui o próprio usuário e esconde inativos por padrão. Aceita ordenar por `cargoNome`. |
| `POST /api/usuario` | `funcionarios.editar` | Cria funcionário. |
| `GET /api/usuario/:cpf` | o próprio usuário ou `funcionarios.editar` | Detalhe. |
| `PUT` / `PATCH /api/usuario/:cpf` | o próprio usuário ou `funcionarios.editar` (regras abaixo) | Atualiza. |
| `POST /api/usuario/:cpf/senha` | o próprio usuário ou `funcionarios.editar` (regras abaixo) | Troca a senha informando a atual. |

Não existe `DELETE`: um funcionário é desativado com `ativo: false`.

## Criação

O corpo precisa de `cpf`, `nome`, `email`, `senha` e `cargoId` (`validateCreateUsuario`). O serviço grava o CPF só com dígitos, o e-mail em minúsculas e a senha com `bcrypt` (`BCRYPT_ROUNDS`, padrão 12).

O funcionário nasce com `senhaInicial = true`, `fundador = false` e `empresaId` igual ao de quem criou. Ele precisa trocar a senha no primeiro acesso.

O cargo `Superadmin` não pode ser atribuído a ninguém. Um e-mail ou CPF repetido responde 409 com o campo marcado.

Se quem cria não é superadmin, o superadmin recebe um aviso em [tempo real](../tempo-real.md).

## Atualização

Campos aceitos: `nome`, `email`, `senha`, `cargoId`, `ativo`, `senhaInicial`. O CPF não muda.

Regras do controller (`updateUsuario`):

- Para editar outra pessoa é preciso `funcionarios.editar`.
- Ninguém altera o fundador nem um superadmin (403 `Não é permitido alterar este usuário`), exceto ele mesmo.
- Na própria conta, é proibido mexer em `cargoId`, `ativo` e `senhaInicial` (409), para ninguém se dar um cargo maior nem se reativar.
- Quem não é gerente nem superadmin não altera o próprio `nome`, `email` ou `senha` por aqui.
- Enviar `senha` ou `senhaInicial` para **outra** pessoa (redefinir senha) é só do superadmin. O frontend, ao redefinir, envia `senha` e `senhaInicial: true`, para que o funcionário troque a senha no próximo acesso.

Regras do serviço: o fundador não pode ser inativado nem sair do cargo de superadmin, e o cargo superadmin é exclusivo dele.

PUT e PATCH usam o mesmo tratamento: só os campos enviados mudam.

## Troca de senha

`POST /api/usuario/:cpf/senha` com `{ senhaAtual, senhaNova }` (`validateChangeSenha`, mínimo de 8 caracteres).

- Quem não é gerente nem superadmin só troca a **própria** senha quando ela ainda é a inicial.
- A senha atual precisa conferir (400 `Senha atual inválida`).
- Ao trocar, `senhaInicial` volta para `false`.
- Esta é a única escrita liberada para quem ainda tem a senha inicial.

## Resposta

Todas devolvem o usuário público: `cpf`, `nome`, `email`, `ativo`, `senhaInicial`, `fundador`, `cargoId`, `empresaId`, `nivelAcesso` (do cargo), `cargoNome`, `criadoEm`, `modificadoEm`.

## Auditoria

Criar e atualizar registram `funcionario` na [auditoria](./logs-de-auditoria.md). Senhas e hashes saem redigidos (`[redacted]`).
