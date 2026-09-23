import http from "node:http";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { WebSocket } from "ws";
import { parseWsMessage, serializeWsMessage, type WsServerMessage } from "@shared/net/wsProtocol";
import { createApp } from "../src/app.js";
import { attachMecarvitRealtime } from "../src/realtime/mecarvitRealtime.js";
import {
    SENHA,
    SENHA_NOVA,
    bearer,
    cadastrarOficina,
    criarCargo,
    criarFuncionario,
    uniqueCpf
} from "./helpers.js";

function listen(server: http.Server): Promise<number> {
    return new Promise((resolve, reject) => {
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();

            if (!address || typeof address === "string") {
                reject(new Error("no port"));
                return;
            }

            resolve(address.port);
        });
    });
}

function waitEvent(socket: WebSocket): Promise<WsServerMessage> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error("timeout waiting for realtime event"));
        }, 4000);

        socket.on("message", (data) => {
            const parsed = parseWsMessage(String(data));

            if (parsed?.op === "event") {
                clearTimeout(timer);
                resolve(parsed);
            }
        });
    });
}

describe("cadastro realtime for superadmin", () => {
    it("notifies the superadmin when a staff member creates a client", async () => {
        const app = createApp();
        const server = http.createServer(app);
        const hub = attachMecarvitRealtime(server);
        const port = await listen(server);

        const oficina = await cadastrarOficina(app);
        const adminToken = oficina.token as string;
        const empresaId = oficina.empresaId as number;
        const cargo = await criarCargo(app, adminToken);
        const funcionario = await criarFuncionario(app, adminToken, cargo.id, {
            nome: "Bruno Funcionario"
        });

        const login = await request(app)
            .post("/api/login")
            .send({
                email: funcionario.email,
                senha: funcionario.senha,
                empresaId
            })
            .expect(200);

        const staffToken = login.body.data.token as string;

        await request(app)
            .post(`/api/usuario/${funcionario.cpf}/senha`)
            .set(bearer(staffToken))
            .send({ senhaAtual: SENHA, senhaNova: SENHA_NOVA })
            .expect(200);

        const loginAfter = await request(app)
            .post("/api/login")
            .send({
                email: funcionario.email,
                senha: SENHA_NOVA,
                empresaId
            })
            .expect(200);

        const staffTokenReady = loginAfter.body.data.token as string;

        const adminSocket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
        await new Promise((resolve) => adminSocket.on("open", resolve));
        adminSocket.send(serializeWsMessage({ op: "auth", token: adminToken }));

        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("ready timeout")), 3000);

            adminSocket.on("message", (data) => {
                const parsed = parseWsMessage(String(data));

                if (parsed?.op === "ready") {
                    clearTimeout(timer);
                    resolve();
                }
            });
        });

        const pendingEvent = waitEvent(adminSocket);
        const documento = uniqueCpf();

        await request(app)
            .post("/api/cliente")
            .set(bearer(staffTokenReady))
            .send({ documento, nome: "Cliente Novo" })
            .expect(201);

        const event = await pendingEvent;

        expect(event.op).toBe("event");
        expect(event).toMatchObject({
            op: "event",
            topic: `empresa:${empresaId}:superadmin`,
            payload: {
                kind: "cadastro",
                entity: "cliente",
                actorNome: "Bruno Funcionario"
            }
        });

        adminSocket.close();
        hub.close();
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });
});
