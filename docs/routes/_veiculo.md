# /api/veiculo

- `GET /api/veiculo`
- `POST /api/veiculo`
- `DELETE /api/veiculo/[id]`
- `GET /api/veiculo/[id]`
- `PATCH /api/veiculo/[id]`
- `PUT /api/veiculo/[id]`

## GET /api/veiculo

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

## POST /api/veiculo

Sent data

```json
{
  "modelo": "Gol",
  "placa": "ABC1D23",
  "clienteDocumento": "39053344705"
}
```

Response

```json
{
  "data": {
    "id": 1,
    "modelo": "Gol",
    "placa": "ABC1D23",
    "clienteDocumento": "39053344705"
  }
}
```

## DELETE /api/veiculo/[id]

Sent data

```json
{}
```

Response

```json
{}
```

## GET /api/veiculo/[id]

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

## PATCH /api/veiculo/[id]

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

## PUT /api/veiculo/[id]

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
