# Tempo real (WebSocket)

O servidor aceita conexões WebSocket no **mesmo servidor HTTP e porta** da API, no caminho `/ws`. Código em `src/realtime/`; o protocolo é compartilhado em `@shared/net/wsProtocol`.

## Protocolo

| Direção | Mensagem | Significado |
| --- | --- | --- |
| cliente → servidor | `{ "op": "auth", "token": "…" }` | Autentica a conexão. |
| cliente → servidor | `{ "op": "ping" }` | Resposta `{ "op": "pong" }`. |
| servidor → cliente | `{ "op": "ready", "topics": […] }` | Autenticou; lista os tópicos que a conexão recebe. |
| servidor → cliente | `{ "op": "event", "topic": "…", "payload": … }` | Evento publicado em um tópico. |
| servidor → cliente | `{ "op": "error", "code": "…", "message": "…" }` | Mensagem inválida ou fora de ordem. |

Mensagens passam de 64 KB: a conexão é rejeitada. Tópicos válidos casam `^[a-zA-Z0-9:_-]{1,128}$`.

## Conexão

`createWsHub` (`createWsHub.ts`) gerencia os clientes:

1. Ao conectar, se a requisição já traz o cookie `cht_auth`, autentica sozinha e envia `ready`. Os navegadores mandam o cookie no handshake, então o frontend normalmente não precisa enviar `auth`.
2. Senão, a conexão tem 4 segundos para enviar `auth`; passado o prazo, é fechada com o código 4401. Token inválido também fecha com 4401.
3. O cliente **não escolhe** tópicos: eles vêm da identidade autenticada.

## Autenticação e tópicos do Mecarvit

`authenticateMecarvitSocket` (`mecarvitRealtime.ts`) valida o token como o [`protect`](./autenticacao-e-acesso.md#protect) e devolve os tópicos do usuário:

- `user:{cpf}`
- `empresa:{empresaId}`
- `empresa:{empresaId}:superadmin`, só para quem é superadmin

## Quem publica o quê

`notifyStaffCadastro(req, entidade)` é chamado depois que um funcionário **que não é superadmin** cria um registro (funcionário, cargo, cliente, endereço, veículo ou serviço). Ele publica em `empresa:{id}:superadmin` um payload `{ kind: "cadastro", entity, actorNome, actorCpf, label }`. O superadmin conectado vê no frontend o aviso "Fulano cadastrou um cliente".

`registry.ts` guarda a instância do hub (`setRealtimeHub`, `publishRealtime`) para que os controllers publiquem sem importar o servidor.
