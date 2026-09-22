import type { AddressInfo, Server as NetServer } from "node:net";
import { candidatePorts } from "@shared/net/portScan";

function actualBoundPort(server: NetServer, fallback: number): number {
    const address = server.address();

    if (address && typeof address === "object") {
        return (address as AddressInfo).port;
    }

    return fallback;
}

function listenOnce<T extends NetServer>(
    server: T,
    port: number,
    host: string
): Promise<{ server: T; port: number }> {
    return new Promise((resolve, reject) => {
        const onError = (error: NodeJS.ErrnoException) => {
            server.off("listening", onListening);
            reject(error);
        };

        const onListening = () => {
            server.off("error", onError);
            resolve({ server, port: actualBoundPort(server, port) });
        };

        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port, host);
    });
}

export async function listenOnAvailablePort<T extends NetServer>(
    server: T,
    startPort: number,
    host: string,
    maxOffset: number
): Promise<{ server: T; port: number }> {
    if (startPort === 0) {
        return listenOnce(server, 0, host);
    }

    const ports = candidatePorts(startPort, maxOffset);

    for (const port of ports) {
        try {
            return await listenOnce(server, port, host);
        } catch (error) {
            const err = error as NodeJS.ErrnoException;

            if (err.code !== "EADDRINUSE") {
                throw error;
            }
        }
    }

    throw new Error(`Nenhuma porta livre entre ${startPort} e ${startPort + maxOffset} em ${host}`);
}
