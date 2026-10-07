# Testes

Rodam com **Vitest** (`npm run tests`). A configuração está em `vitest.config.ts`: ambiente Node, arquivos em série (`fileParallelism: false`), tempo limite de 60 s e o alias `@shared` apontando para o `cht-shared`.

## Isolamento

`tests/setup.ts` prepara cada execução:

- `EMPRESAS_DIR` aponta para uma pasta temporária, apagada no fim. Os testes nunca tocam em `data/`.
- `NODE_ENV=test`, `JWT_SECRET` próprio e `BCRYPT_ROUNDS=4` (hash rápido).
- Ao terminar, fecha todas as conexões.

`tests/helpers.ts` traz funções para criar oficinas, cargos e funcionários e para gerar CPFs, CNPJs e e-mails únicos.

## O que cada arquivo cobre

| Arquivo | Assunto |
| --- | --- |
| `auth.test.ts` | `/health`, cadastro e login. |
| `usuario.test.ts` | Funcionários, cargos e senha inicial. |
| `cliente.test.ts` | Clientes, veículos, empresa e cargos. |
| `os.test.ts` | Ordens de serviço, financeiro e dashboard. |
| `dataLimitePagamento.test.ts` | Prazo de pagamento nos registros e filtro por dia (UTC). |
| `osDataLimitePagamento.test.ts` | Prazo de pagamento na OS e filtro na lista de OS. |
| `todoFeatures.test.ts` | Catálogo de permissões, situação de pagamento e regras de OS e pagamentos. |
| `security.test.ts` | Segurança das rotas. |
| `auditLog.test.ts` | Serviço de [auditoria](./entidades/logs-de-auditoria.md). |
| `cadastroRealtime.test.ts` | Aviso de cadastro ao superadmin. |
| `wsHub.test.ts`, `wsProtocol.test.ts` | Servidor WebSocket e protocolo. |
| `findListenPort.test.ts` | Escolha de porta livre. |
| `envJwt.test.ts` | Regra do `JWT_SECRET`. |
| `mock.test.ts` | Dados de demonstração. |
| `modalQuery.test.ts` | Estado de modais na URL (`cht-shared`). |

Há ainda checks pontuais ao lado do código: `src/services/dashboardService.check.ts` e `src/db/mock/seedDates.check.ts`.

## Escrevendo um teste

Crie `tests/<assunto>.test.ts`, monte o app com `createApp()` (`src/app.ts`) e chame-o com **supertest**:

```ts
import request from "supertest";
import { createApp } from "../src/app.js";
import { bearer, cadastrarOficina } from "./helpers.js";

const app = createApp();
const { token } = await cadastrarOficina(app);
const response = await request(app).get("/api/me").set(bearer(token)).expect(200);
```

Em `helpers.ts`: `cadastrarOficina`, `criarCargo`, `criarFuncionario`, `uniqueCpf`, `uniqueCnpj`, `uniqueEmail`, `bearer`, `cookieHeaderFromResponse` e `enderecoPadrao`. Lógica nova e não trivial deve vir com pelo menos um teste (ver o [CONTRIBUTING](https://github.com/celiy/cht-main/blob/main/CONTRIBUTING.md)).
