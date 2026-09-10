# /api/cliente

- `GET /api/cliente`
- `POST /api/cliente`
- `DELETE /api/cliente/[documento]`
- `GET /api/cliente/[documento]`
- `PATCH /api/cliente/[documento]`
- `PUT /api/cliente/[documento]`

## GET /api/cliente

Sent data

```json
{}
```

Response

```json
{
  "data": [
    {
      "documento": "39053344705",
      "nome": "João da Silva",
      "email": "joao@cliente.test",
      "cel": "11999990000",
      "ativo": true,
      "enderecos": [
        {
          "id": 1,
          "estado": "SP",
          "cidade": "São Paulo",
          "cep": "01001000",
          "bairro": "Sé",
          "rua": "Praça da Sé",
          "numero": 1,
          "complemento": "Sala 1"
        }
      ],
      "veiculos": [
        {
          "id": 1,
          "modelo": "Gol",
          "placa": "ABC1D23",
          "clienteDocumento": "39053344705"
        }
      ],
      "ordensServico": []
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```

## POST /api/cliente

Sent data

```json
{
  "documento": "390.533.447-05",
  "nome": "João da Silva",
  "enderecos": [
    {
      "estado": "SP",
      "cidade": "São Paulo",
      "cep": "01001000",
      "bairro": "Sé",
      "rua": "Praça da Sé",
      "numero": 1,
      "complemento": "Sala 1"
    }
  ],
  "veiculos": [
    {
      "modelo": "Gol",
      "placa": "ABC1D23"
    }
  ]
}
```

Response

```json
{
  "data": {
    "documento": "39053344705",
    "nome": "João da Silva",
    "email": "joao@cliente.test",
    "cel": "11999990000",
    "ativo": true,
    "enderecos": [
      {
        "id": 1,
        "estado": "SP",
        "cidade": "São Paulo",
        "cep": "01001000",
        "bairro": "Sé",
        "rua": "Praça da Sé",
        "numero": 1,
        "complemento": "Sala 1"
      }
    ],
    "veiculos": [
      {
        "id": 1,
        "modelo": "Gol",
        "placa": "ABC1D23",
        "clienteDocumento": "39053344705"
      }
    ],
    "ordensServico": []
  }
}
```

## DELETE /api/cliente/[documento]

Sent data

```json
{}
```

Response

```json
{}
```

## GET /api/cliente/[documento]

Sent data

```json
{}
```

Response

```json
{
  "data": {
    "documento": "39053344705",
    "nome": "João da Silva",
    "email": "joao@cliente.test",
    "cel": "11999990000",
    "ativo": true,
    "enderecos": [
      {
        "id": 1,
        "estado": "SP",
        "cidade": "São Paulo",
        "cep": "01001000",
        "bairro": "Sé",
        "rua": "Praça da Sé",
        "numero": 1,
        "complemento": "Sala 1"
      }
    ],
    "veiculos": [
      {
        "id": 1,
        "modelo": "Gol",
        "placa": "ABC1D23",
        "clienteDocumento": "39053344705"
      }
    ],
    "ordensServico": []
  }
}
```

## PATCH /api/cliente/[documento]

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

## PUT /api/cliente/[documento]

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
