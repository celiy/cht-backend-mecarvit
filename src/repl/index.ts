import { spawn } from "node:child_process";
import readline from "node:readline";
import type { Express } from "express";
import { env } from "../config/env.js";
import { documentRoutes } from "./documentRoutes.js";

export function startRepl(app: Express): void {
    if (env.isProduction || env.nodeEnv === "test") {
        return;
    }

    if (!process.stdin.isTTY) {
        return;
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "mecarvit> "
    });

    console.log("REPL DEV ativo. Comandos: document-routes, run-tests");
    rl.prompt();

    rl.on("line", async (input) => {
        const command = input.trim();

        try {
            if (command === "document-routes") {
                const files = await documentRoutes(app);
                console.log(`Rotas documentadas em:\n- ${files.join("\n- ")}`);
            } else if (command === "run-tests") {
                await runTests();
            } else if (command === "help" || command === "?") {
                console.log("Comandos: document-routes, run-tests");
            } else if (command) {
                console.log(`Comando desconhecido: ${command}. Use document-routes ou run-tests.`);
            }
        } catch (error) {
            console.error(error);
        }

        rl.prompt();
    });
}

function runTests(): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn("npm", ["run", "tests"], {
            cwd: process.cwd(),
            stdio: "inherit",
            env: process.env
        });

        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`testes encerraram com código ${code}`));
        });
    });
}
