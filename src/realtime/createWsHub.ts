import type { IncomingMessage, Server as HttpServer } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import {
    isValidWsTopic,
    parseWsMessage,
    serializeWsMessage,
    WS_DEFAULT_PATH,
    WS_MAX_MESSAGE_BYTES,
    type WsServerMessage
} from "@shared/net/wsProtocol";

export type WsConnectionIdentity = {
    id: string;
    topics: string[];
};

export type WsHubAuthenticate = (token: string, request: IncomingMessage) => Promise<WsConnectionIdentity | null>;

export type CreateWsHubOptions = {
    authenticate: WsHubAuthenticate;
    path?: string;
    authTimeoutMs?: number;
};

type HubSocket = {
    socket: WebSocket;
    identity: WsConnectionIdentity | null;
    topics: Set<string>;
};

export type WsHub = {
    attach: (server: HttpServer) => void;
    publish: (topic: string, payload: unknown) => number;
    close: () => void;
};

function send(socket: WebSocket, message: WsServerMessage): void {
    if (socket.readyState !== WebSocket.OPEN) {
        return;
    }

    socket.send(serializeWsMessage(message));
}

export function createWsHub(options: CreateWsHubOptions): WsHub {
    const path = options.path ?? WS_DEFAULT_PATH;
    const authTimeoutMs = options.authTimeoutMs ?? 4000;
    const clients = new Set<HubSocket>();
    let wss: WebSocketServer | null = null;

    function drop(entry: HubSocket, code: number, reason: string): void {
        clients.delete(entry);

        if (entry.socket.readyState === WebSocket.OPEN || entry.socket.readyState === WebSocket.CONNECTING) {
            entry.socket.close(code, reason);
        }
    }

    function subscribe(entry: HubSocket, topics: string[]): void {
        for (const topic of topics) {
            if (isValidWsTopic(topic)) {
                entry.topics.add(topic);
            }
        }
    }

    return {
        attach(server: HttpServer) {
            wss = new WebSocketServer({
                server,
                path,
                maxPayload: WS_MAX_MESSAGE_BYTES
            });

            wss.on("connection", (socket, request) => {
                const entry: HubSocket = {
                    socket,
                    identity: null,
                    topics: new Set()
                };

                clients.add(entry);

                const authTimer = setTimeout(() => {
                    if (!entry.identity) {
                        drop(entry, 4401, "auth timeout");
                    }
                }, authTimeoutMs);

                socket.on("message", (data) => {
                    void (async () => {
                        const parsed = parseWsMessage(String(data));

                        if (!parsed) {
                            send(socket, {
                                op: "error",
                                code: "invalid_message",
                                message: "Mensagem inválida"
                            });
                            return;
                        }

                        if (parsed.op === "ping") {
                            send(socket, { op: "pong" });
                            return;
                        }

                        if (parsed.op !== "auth") {
                            send(socket, {
                                op: "error",
                                code: "unexpected",
                                message: "Autentique-se primeiro"
                            });
                            return;
                        }

                        if (entry.identity) {
                            send(socket, {
                                op: "error",
                                code: "already_authenticated",
                                message: "Já autenticado"
                            });
                            return;
                        }

                        const identity = await options.authenticate(parsed.token, request);

                        if (!identity) {
                            clearTimeout(authTimer);
                            drop(entry, 4401, "unauthorized");
                            return;
                        }

                        entry.identity = identity;
                        subscribe(entry, identity.topics);
                        clearTimeout(authTimer);
                        send(socket, { op: "ready", topics: [...entry.topics] });
                    })();
                });

                socket.on("close", () => {
                    clearTimeout(authTimer);
                    clients.delete(entry);
                });
            });
        },

        publish(topic: string, payload: unknown): number {
            if (!isValidWsTopic(topic)) {
                return 0;
            }

            let sent = 0;

            for (const entry of clients) {
                if (!entry.topics.has(topic)) {
                    continue;
                }

                send(entry.socket, { op: "event", topic, payload });
                sent += 1;
            }

            return sent;
        },

        close() {
            for (const entry of clients) {
                entry.socket.close(1001, "hub closed");
            }

            clients.clear();
            wss?.close();
            wss = null;
        }
    };
}
