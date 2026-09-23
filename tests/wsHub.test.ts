import http from "node:http";
import { describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { parseWsMessage, serializeWsMessage, type WsServerMessage } from "@shared/net/wsProtocol";
import { createWsHub } from "../src/realtime/createWsHub.js";

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

function closeServer(server: http.Server): Promise<void> {
    return new Promise((resolve) => {
        server.close(() => resolve());
    });
}

function waitMessage(socket: WebSocket): Promise<WsServerMessage> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error("timeout waiting for ws message"));
        }, 3000);

        socket.once("message", (data) => {
            clearTimeout(timer);
            const parsed = parseWsMessage(String(data));

            if (!parsed || !("op" in parsed)) {
                reject(new Error("invalid message"));
                return;
            }

            resolve(parsed as WsServerMessage);
        });
    });
}

describe("createWsHub", () => {
    it("rejects connections that never authenticate", async () => {
        const server = http.createServer();
        const hub = createWsHub({
            authenticate: async () => ({ id: "u1", topics: ["room:a"] }),
            authTimeoutMs: 50
        });

        hub.attach(server);
        const port = await listen(server);
        const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);

        const closed = await new Promise<number>((resolve) => {
            socket.on("close", (code) => resolve(code));
        });

        expect(closed).toBe(4401);
        hub.close();
        await closeServer(server);
    });

    it("delivers published events only to subscribed topics", async () => {
        const server = http.createServer();
        const hub = createWsHub({
            authenticate: async (token) => {
                if (token === "admin") {
                    return { id: "admin", topics: ["empresa:1:superadmin"] };
                }

                if (token === "staff") {
                    return { id: "staff", topics: ["empresa:1"] };
                }

                return null;
            }
        });

        hub.attach(server);
        const port = await listen(server);

        const admin = new WebSocket(`ws://127.0.0.1:${port}/ws`);
        await new Promise((resolve) => admin.on("open", resolve));
        admin.send(serializeWsMessage({ op: "auth", token: "admin" }));
        expect((await waitMessage(admin)).op).toBe("ready");

        const staff = new WebSocket(`ws://127.0.0.1:${port}/ws`);
        await new Promise((resolve) => staff.on("open", resolve));
        staff.send(serializeWsMessage({ op: "auth", token: "staff" }));
        expect((await waitMessage(staff)).op).toBe("ready");

        const staffGotEvent = new Promise((resolve) => {
            staff.once("message", () => resolve(true));
            setTimeout(() => resolve(false), 200);
        });

        hub.publish("empresa:1:superadmin", { kind: "cadastro", entity: "cliente" });
        const event = await waitMessage(admin);

        expect(event).toEqual({
            op: "event",
            topic: "empresa:1:superadmin",
            payload: { kind: "cadastro", entity: "cliente" }
        });
        expect(await staffGotEvent).toBe(false);

        admin.close();
        staff.close();
        hub.close();
        await closeServer(server);
    });
});
