# Começando

Guia mínimo para subir o backend Mecarvit com uma base de demonstração. Por enquanto cobre só o login do superadmin mock. O seed cria muito mais do que isso (funcionários, clientes, veículos, OS e financeiro).

## 1. Subir o backend

No diretório `cht-backend-mecarvit`:

```bash
cp .env.example .env
npm install
npm run dev
```

API em `http://127.0.0.1:8000`. Prefixo `/api`.

## 2. Popular dados mock

```bash
npm run db:mock
```

Cria (ou refaz) a empresa **Oficina Mock Mecarvit**. Todo registro gerado pelo seed tem `mock = true` no SQLite. Rodar de novo apaga só os dados mock dessa empresa e popula outra vez.

Se o servidor já estiver no ar, reinicie depois do seed (`npm run dev`).

## 3. Login do superadmin

Na tela de login (ou em `POST /api/login`):

| Campo | Valor |
| --- | --- |
| Email | `superadmin@mock.mecarvit` |
| Senha | `Mock1234` |
| Oficina | Oficina Mock Mecarvit |

Se existir outra empresa local com gestor, o login pede para escolher a oficina.

O seed também cria dezenas de funcionários (`funcionario.1@mock.mecarvit`, `funcionario.2@mock.mecarvit`, …) com a mesma senha `Mock1234`. Este guia documenta só o superadmin.

## 4. Limpar só o mock

```bash
npm run db:mock:clear
```

Apaga registros com `mock = true` em todas as empresas locais. Não mexe em cadastros reais (`mock = false`). A empresa mock continua no disco; rode `npm run db:mock` para popular de novo.

Para apagar **todos** os SQLite (mock e real): `npm run db:reset`.
