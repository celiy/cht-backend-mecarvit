# /api/servico

- `GET /api/servico`
- `POST /api/servico`
- `DELETE /api/servico/[id]`
- `GET /api/servico/[id]`
- `PATCH /api/servico/[id]`
- `PUT /api/servico/[id]`

## GET /api/servico

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

## POST /api/servico

Sent data

```json
{
  "nome": "Troca de óleo"
}
```

Response

```json
{
  "data": {
    "id": 1,
    "nome": "Troca de óleo"
  }
}
```

## DELETE /api/servico/[id]

Sent data

```json
{}
```

Response

```json
{}
```

## GET /api/servico/[id]

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

## PATCH /api/servico/[id]

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

## PUT /api/servico/[id]

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
