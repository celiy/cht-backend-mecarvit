# /api/ordem-servico

- `GET /api/ordem-servico`
- `POST /api/ordem-servico`
- `DELETE /api/ordem-servico/[id]`
- `GET /api/ordem-servico/[id]`
- `PATCH /api/ordem-servico/[id]`
- `PUT /api/ordem-servico/[id]`

## GET /api/ordem-servico

Sent data

```json
{}
```

Response

```json
{
  "data": [],
  "page": 1,
  "limit": 10,
  "total": 0
}
```

## POST /api/ordem-servico

Sent data

```json
{
  "clienteDocumento": "39053344705",
  "veiculoId": 1,
  "itens": [
    {
      "servicoId": 1,
      "quantidade": 1,
      "valorObra": 150,
      "valorPecas": 20
    }
  ]
}
```

Response

```json
{
  "data": {
    "id": 1,
    "clienteDocumento": "39053344705",
    "veiculoId": 1,
    "statusOsId": 1,
    "itens": [
      {
        "servicoId": 1,
        "quantidade": 1,
        "valorObra": 150,
        "valorPecas": 20
      }
    ],
    "responsaveis": [
      "39053344705"
    ],
    "pagamentos": [],
    "registroEntradaSaida": null,
    "total": 170
  }
}
```

## DELETE /api/ordem-servico/[id]

Sent data

```json
{}
```

Response

```json
{}
```

## GET /api/ordem-servico/[id]

Sent data

```json
{}
```

Response

```json
{
  "data": {
    "id": 1,
    "clienteDocumento": "39053344705",
    "veiculoId": 1,
    "statusOsId": 1,
    "itens": [
      {
        "servicoId": 1,
        "quantidade": 1,
        "valorObra": 150,
        "valorPecas": 20
      }
    ],
    "responsaveis": [
      "39053344705"
    ],
    "pagamentos": [],
    "registroEntradaSaida": null,
    "total": 170
  }
}
```

## PATCH /api/ordem-servico/[id]

Sent data

```json
{
  "statusOsId": 4
}
```

Response

```json
{
  "data": {
    "id": 1,
    "clienteDocumento": "39053344705",
    "veiculoId": 1,
    "statusOsId": 4,
    "itens": [
      {
        "servicoId": 1,
        "quantidade": 1,
        "valorObra": 150,
        "valorPecas": 20
      }
    ],
    "responsaveis": [
      "39053344705"
    ],
    "pagamentos": [],
    "registroEntradaSaida": null,
    "total": 170
  }
}
```

## PUT /api/ordem-servico/[id]

Sent data

```json
{
  "clienteDocumento": "39053344705",
  "veiculoId": 1,
  "statusOsId": 3,
  "itens": [
    {
      "servicoId": 1,
      "quantidade": 1,
      "valorObra": 150,
      "valorPecas": 20
    }
  ]
}
```

Response

```json
{
  "data": {
    "id": 1,
    "clienteDocumento": "39053344705",
    "veiculoId": 1,
    "statusOsId": 3,
    "itens": [
      {
        "servicoId": 1,
        "quantidade": 1,
        "valorObra": 150,
        "valorPecas": 20
      }
    ],
    "responsaveis": [
      "39053344705"
    ],
    "pagamentos": [],
    "registroEntradaSaida": null,
    "total": 170
  }
}
```
