# /api/regentradasaida

- `GET /api/regentradasaida`
- `POST /api/regentradasaida`
- `DELETE /api/regentradasaida/[id]`
- `GET /api/regentradasaida/[id]`
- `PATCH /api/regentradasaida/[id]`
- `PUT /api/regentradasaida/[id]`

## GET /api/regentradasaida

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

## POST /api/regentradasaida

Sent data

```json
{
  "tipo": "saida",
  "nome": "Compra de peças",
  "valor": 80
}
```

Response

```json
{
  "data": {
    "id": 1,
    "tipo": "saida",
    "nome": "Compra de peças",
    "valor": 80,
    "pagamentos": [],
    "ordemServico": null
  }
}
```

## DELETE /api/regentradasaida/[id]

Sent data

```json
{}
```

Response

```json
{}
```

## GET /api/regentradasaida/[id]

Sent data

```json
{}
```

Response

```json
{
  "data": {}
}
```

## PATCH /api/regentradasaida/[id]

Sent data

```json
{}
```

Response

```json
{
  "data": {}
}
```

## PUT /api/regentradasaida/[id]

Sent data

```json
{}
```

Response

```json
{
  "data": {}
}
```
