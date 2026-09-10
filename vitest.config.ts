import path from "node:path";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            "@shared": path.resolve(rootDir, "../cht-shared/src")
        }
    },
    test: {
        environment: "node",
        setupFiles: ["./tests/setup.ts"],
        fileParallelism: false,
        sequence: {
            concurrent: false
        },
        hookTimeout: 60000,
        testTimeout: 60000
    }
});
