import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { empresasDir } from "../src/config/database.js";
import {
    appendAuditLog,
    auditLogFilePath,
    listAuditLogs,
    purgeOldAuditLogs,
    sanitizeAuditValue
} from "../src/services/auditLogService.js";

describe("auditLogService", () => {
    const empresaId = 4242;

    afterEach(() => {
        const root = path.join(empresasDir(), String(empresaId));

        if (fs.existsSync(root)) {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });

    it("redacts sensitive fields", () => {
        const sanitized = sanitizeAuditValue({
            nome: "Ana",
            senha: "secret",
            passwordHash: "abc"
        }) as Record<string, unknown>;

        expect(sanitized.nome).toBe("Ana");
        expect(sanitized.senha).toBe("[redacted]");
        expect(sanitized.passwordHash).toBe("[redacted]");
    });

    it("appends and lists entries for the same day", () => {
        const entry = appendAuditLog(empresaId, {
            actor: { type: "user", id: "123", name: "Ana" },
            action: "create",
            entity: "cliente",
            entityId: "52998224725",
            after: { nome: "Cliente" }
        });

        const filePath = auditLogFilePath(empresaId, new Date(entry.occurredAt));

        expect(fs.existsSync(filePath)).toBe(true);

        const listed = listAuditLogs(empresaId, { page: 1, limit: 10 });

        expect(listed.total).toBe(1);
        expect(listed.data[0]?.id).toBe(entry.id);
        expect(listed.data[0]?.changes?.length).toBeGreaterThan(0);
    });

    it("purges month folders older than retention", () => {
        const oldMonth = path.join(empresasDir(), String(empresaId), "logs", "01_2020");

        fs.mkdirSync(oldMonth, { recursive: true });
        fs.writeFileSync(path.join(oldMonth, "1.json"), "[]\n", "utf8");

        const removed = purgeOldAuditLogs(empresaId, 6);

        expect(removed.some((item) => item.includes("01_2020"))).toBe(true);
        expect(fs.existsSync(oldMonth)).toBe(false);
    });
});
