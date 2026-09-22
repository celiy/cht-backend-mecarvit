import net from "node:net";
import { describe, expect, it } from "vitest";
import { candidatePorts, parseChtApiUrlFromText, pickApiBaseUrl, replaceUrlPort, resolveApiTarget } from "@shared/net/portScan";
import { listenOnAvailablePort } from "../src/utils/findListenPort.js";

function occupyPort(port: number, host: string): Promise<net.Server> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();

        server.once("error", reject);
        server.listen(port, host, () => {
            resolve(server);
        });
    });
}

function closeServer(server: net.Server): Promise<void> {
    return new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

describe("candidatePorts", () => {
    it("inclui a porta inicial e os offsets até o limite", () => {
        expect(candidatePorts(3001, 2)).toEqual([3001, 3002, 3003]);
    });
});

describe("replaceUrlPort", () => {
    it("troca só a porta, mantendo path de health", () => {
        expect(replaceUrlPort("http://127.0.0.1:3001/health", 3004)).toBe(
            "http://127.0.0.1:3004/health"
        );
    });
});

describe("listenOnAvailablePort", () => {
    it("sobe na porta seguinte quando a inicial está ocupada", async () => {
        const host = "127.0.0.1";
        const start = 39111;
        const blocker = await occupyPort(start, host);

        const app = net.createServer();
        const { port, server } = await listenOnAvailablePort(app, start, host, 5);

        expect(port).toBe(start + 1);

        await closeServer(server);
        await closeServer(blocker);
    });

    it("falha se nenhuma porta no intervalo estiver livre", async () => {
        const host = "127.0.0.1";
        const start = 39121;
        const blockers = [await occupyPort(start, host), await occupyPort(start + 1, host)];

        const app = net.createServer();

        await expect(listenOnAvailablePort(app, start, host, 1)).rejects.toThrow(/Nenhuma porta livre/);

        await Promise.all(blockers.map((server) => closeServer(server)));
    });

    it("PORT 0 deixa o SO escolher uma porta livre", async () => {
        const { port, server } = await listenOnAvailablePort(net.createServer(), 0, "127.0.0.1", 0);

        expect(port).toBeGreaterThan(0);

        await closeServer(server);
    });
});

describe("parseChtApiUrlFromText", () => {
    it("lê a linha CHT_API_URL no stdout", () => {
        expect(parseChtApiUrlFromText("Servidor iniciado\nCHT_API_URL=http://127.0.0.1:54321\n")).toBe(
            "http://127.0.0.1:54321"
        );
    });
});

describe("pickApiBaseUrl / resolveApiTarget", () => {
    it("escolhe a URL do alvo e cai no apiBaseUrl", () => {
        const config = {
            api: {
                electron: "http://127.0.0.1:3001",
                web: "https://api.example.com"
            },
            apiBaseUrl: "http://127.0.0.1:8000"
        };

        expect(pickApiBaseUrl(config, "electron")).toBe("http://127.0.0.1:3001");
        expect(pickApiBaseUrl(config, "web")).toBe("https://api.example.com");
        expect(pickApiBaseUrl(config, "dev")).toBe("http://127.0.0.1:8000");
        expect(resolveApiTarget({ electronBuild: true })).toBe("electron");
        expect(resolveApiTarget({ command: "build" })).toBe("web");
        expect(resolveApiTarget({ command: "serve" })).toBe("dev");
        expect(resolveApiTarget({ command: "build", override: "mobile" })).toBe("mobile");
    });
});
