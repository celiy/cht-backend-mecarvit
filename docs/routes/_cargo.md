# /api/cargo

- `GET /api/cargo`
- `POST /api/cargo`
- `DELETE /api/cargo/[id]`
- `GET /api/cargo/[id]`
- `PATCH /api/cargo/[id]`
- `PUT /api/cargo/[id]`

## GET /api/cargo

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
      "nome": "Superadmin",
      "nivelAcesso": "0"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```

## POST /api/cargo

Sent data

```json
{
  "nome": "Atendente",
  "nivelAcesso": "2"
}
```

Response

```json
{
  "data": {
    "id": 2,
    "nome": "Atendente",
    "nivelAcesso": "2"
  }
}
```

## DELETE /api/cargo/[id]

Sent data

```json
{}
```

Response

```json
{}
```

## GET /api/cargo/[id]

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

## PATCH /api/cargo/[id]

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

## PUT /api/cargo/[id]

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
