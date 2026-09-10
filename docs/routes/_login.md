# /api/login

- `POST /api/login`

## POST /api/login

Sent data

```json
{
  "email": "ana@oficina.test",
  "senha": "SenhaForte1"
}
```

Response

```json
{
  "data": {
    "token": "jwt",
    "usuario": {
      "cpf": "39053344705",
      "nome": "Ana Gestora",
      "email": "ana@oficina.test",
      "ativo": true,
      "senhaInicial": false,
      "fundador": true,
      "cargoId": 1,
      "empresaId": 1,
      "nivelAcesso": "0",
      "cargoNome": "Superadmin",
      "criadoEm": "2026-01-15T12:00:00.000Z",
      "modificadoEm": "2026-01-15T12:00:00.000Z"
    },
    "empresa": {
      "id": 1
    },
    "precisaTrocarSenha": false
  }
}
```
