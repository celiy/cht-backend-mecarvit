# cht-backend-mecarvit

Backend específico do cliente Mecarvit.

## O que é

O `cht-backend-mecarvit` é a API do cliente, construída em Node.js com Express e TypeScript.

## O que faz

- Expõe endpoints HTTP para regras de negócio do cliente.
- Gerencia persistência de dados (SQLite + Drizzle ORM).
- Aplica validações, middlewares de segurança e tratamento padronizado de erros.
- Consome do `cht-shared` apenas contratos e utilitários realmente compartilhados.
