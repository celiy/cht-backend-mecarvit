# /api/dashboard

- `GET /api/dashboard/fluxo-mensal`
- `GET /api/dashboard/os-status`

## GET /api/dashboard/fluxo-mensal

Sent data

```json
{}
```

Response

```json
{
  "data": {
    "ano": 2026,
    "meses": [
      {
        "mes": 1,
        "entrada": 170,
        "saida": 80
      }
    ]
  }
}
```

## GET /api/dashboard/os-status

Sent data

```json
{}
```

Response

```json
{
  "data": [
    {
      "id": 1,
      "nome": "aberta",
      "total": 1
    },
    {
      "id": 4,
      "nome": "concluída",
      "total": 0
    }
  ]
}
```
