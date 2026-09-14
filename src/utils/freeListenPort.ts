import { execFileSync } from "node:child_process";
import net from "node:net";

function parsePositiveInt(value: string): number | undefined {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return undefined;
    }

    return parsed;
}

function listWindowsListenerPids(port: number): number[] {
    let output = "";

    try {
        output = execFileSync("netstat", ["-ano", "-p", "TCP"], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"]
        });
    } catch {
        return [];
    }

    const pids = new Set<number>();
    const needle = `:${port}`;

    for (const line of output.split(/\r?\n/)) {
        if (!line.includes("LISTENING") || !line.includes(needle)) {
            continue;
        }

        const columns = line.trim().split(/\s+/);
        const localAddress = columns[1];
        const pid = parsePositiveInt(columns[columns.length - 1] ?? "");

        if (!localAddress || pid === undefined) {
            continue;
        }

        if (localAddress === `0.0.0.0:${port}`
            || localAddress === `[::]:${port}`
            || localAddress === `127.0.0.1:${port}`
            || localAddress.endsWith(`:${port}`)) {
            pids.add(pid);
        }
    }

    return [...pids];
}

function listUnixListenerPids(port: number): number[] {
    try {
        const output = execFileSync("lsof", ["-tiTCP:" + String(port), "-sTCP:LISTEN"], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"]
        });

        return output
            .trim()
            .split(/\s+/)
            .map((value) => parsePositiveInt(value))
            .filter((pid): pid is number => pid !== undefined);
    } catch {
        return [];
    }
}

function listListenerPids(port: number): number[] {
    if (process.platform === "win32") {
        return listWindowsListenerPids(port);
    }

    return listUnixListenerPids(port);
}

function killPid(pid: number): void {
    if (pid === process.pid) {
        return;
    }

    try {
        process.kill(pid, "SIGKILL");
    } catch {
        // Process already gone or not owned by this user.
    }
}

function canBind(port: number, host: string): Promise<boolean> {
    return new Promise((resolve) => {
        const probe = net.createServer();

        probe.once("error", () => {
            resolve(false);
        });

        probe.once("listening", () => {
            probe.close(() => {
                resolve(true);
            });
        });

        probe.listen(port, host);
    });
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * Frees `port` by killing other processes that are listening on it.
 */
export async function freeListenPort(port: number, host: string, timeoutMs = 2000): Promise<void> {
    if (await canBind(port, host)) {
        return;
    }

    for (const pid of listListenerPids(port)) {
        killPid(pid);
    }

    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (await canBind(port, host)) {
            return;
        }

        await wait(50);
    }
}
