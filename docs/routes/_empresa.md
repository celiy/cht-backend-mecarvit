# /api/empresa

- `GET /api/empresa`
- `GET /api/empresa/[id]`
- `PATCH /api/empresa/[id]`
- `PUT /api/empresa/[id]`

## GET /api/empresa

Sent data

```json
{}
```

Response

```json
{
  "data": {
    "id": 1,
    "nome": "Oficina Central",
    "criadoEm": "2026-01-15T12:00:00.000Z",
    "modificadoEm": "2026-01-15T12:00:00.000Z"
  }
}
```

## GET /api/empresa/[id]

Sent data

```json
{}
```

Response

```json
{
  "data": {
    "id": 1,
    "nome": "Oficina Central",
    "criadoEm": "2026-01-15T12:00:00.000Z",
    "modificadoEm": "2026-01-15T12:00:00.000Z"
  }
}
```

## PATCH /api/empresa/[id]

Sent data

```json
{
  "nome": "Oficina Norte"
}
```

Response

```json
{
  "data": {
    "id": 1,
    "nome": "Oficina Norte",
    "criadoEm": "2026-01-15T12:00:00.000Z",
    "modificadoEm": "2026-01-15T12:00:00.000Z"
  }
}
```

## PUT /api/empresa/[id]

Sent data

```json
{
  "nome": "Oficina Central"
}
```

Response

```json
{
  "data": {
    "id": 1,
    "nome": "Oficina Central",
    "criadoEm": "2026-01-15T12:00:00.000Z",
    "modificadoEm": "2026-01-15T12:00:00.000Z"
  }
}
```
