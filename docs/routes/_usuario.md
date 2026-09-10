# /api/usuario

- `GET /api/usuario`
- `POST /api/usuario`
- `GET /api/usuario/[cpf]`
- `PATCH /api/usuario/[cpf]`
- `PUT /api/usuario/[cpf]`
- `POST /api/usuario/[cpf]/senha`

## GET /api/usuario

Sent data

```json
{}
```

Response

```json
{
  "data": [
    {
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
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```

## POST /api/usuario

Sent data

```json
{
  "cpf": "529.982.247-25",
  "nome": "Bruno Funcionario",
  "email": "bruno@oficina.test",
  "senha": "SenhaForte1",
  "cargoId": 2
}
```

Response

```json
{
  "data": {
    "cpf": "52998224725",
    "nome": "Ana Gestora",
    "email": "ana@oficina.test",
    "ativo": true,
    "senhaInicial": true,
    "fundador": false,
    "cargoId": 1,
    "empresaId": 1,
    "nivelAcesso": "0",
    "cargoNome": "Superadmin",
    "criadoEm": "2026-01-15T12:00:00.000Z",
    "modificadoEm": "2026-01-15T12:00:00.000Z"
  }
}
```

## GET /api/usuario/[cpf]

Sent data

```json
{}
```

Response

```json
{
  "data": {
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
  }
}
```

## PATCH /api/usuario/[cpf]

Sent data

```json
{
  "ativo": false
}
```

Response

```json
{
  "data": {
    "cpf": "39053344705",
    "nome": "Ana Gestora",
    "email": "ana@oficina.test",
    "ativo": false,
    "senhaInicial": false,
    "fundador": true,
    "cargoId": 1,
    "empresaId": 1,
    "nivelAcesso": "0",
    "cargoNome": "Superadmin",
    "criadoEm": "2026-01-15T12:00:00.000Z",
    "modificadoEm": "2026-01-15T12:00:00.000Z"
  }
}
```

## PUT /api/usuario/[cpf]

Sent data

```json
{
  "nome": "Ana Gestora",
  "email": "ana@oficina.test",
  "cargoId": 1,
  "ativo": true
}
```

Response

```json
{
  "data": {
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
  }
}
```

## POST /api/usuario/[cpf]/senha

Sent data

```json
{
  "senhaAtual": "SenhaForte1",
  "senhaNova": "OutraSenha1"
}
```

Response

```json
{
  "data": {
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
  }
}
```
