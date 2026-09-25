import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { empresasDir, listLocalEmpresaIds } from "../config/database.js";

export const AUDIT_SCHEMA_VERSION = 1;
export const AUDIT_RETENTION_MONTHS = 6;

export type AuditActorType = "user" | "system";
export type AuditAction = "create" | "update" | "delete" | string;
export type AuditResult = "success" | "failure";

export type AuditActor = {
    type: AuditActorType;
    /** Stable id (CPF) or `"sistema"`. */
    id: string;
    name?: string;
    email?: string;
};

export type AuditChange = {
    field: string;
    before: unknown;
    after: unknown;
};

export type AuditRequestMeta = {
    method?: string;
    path?: string;
    ip?: string;
    userAgent?: string;
    requestId?: string;
};

export type AuditLogEntry = {
    id: string;
    schemaVersion: number;
    occurredAt: string;
    actor: AuditActor;
    action: AuditAction;
    entity: string;
    entityId?: string;
    result: AuditResult;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    changes?: AuditChange[];
    request?: AuditRequestMeta;
    meta?: Record<string, unknown>;
};

export type AuditListQuery = {
    page?: number;
    limit?: number;
    action?: string;
    actor?: string;
    entity?: string;
    from?: string;
    to?: string;
    q?: string;
    /** ApiFeatures-style: `field` or `-field` (comma-separated). */
    sort?: string;
};

const SENSITIVE_KEY_PATTERN =
    /(senha|password|token|secret|hash|authorization|cookie|jwt)/i;

function ensureDir(dir: string): void {
    fs.mkdirSync(dir, { recursive: true });
}

export function empresaLogsRoot(empresaId: number): string {
    return path.join(empresasDir(), String(empresaId), "logs");
}

function monthFolderName(date: Date): string {
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();

    return `${month}_${year}`;
}

function dayFileName(date: Date): string {
    return `${date.getUTCDate()}.json`;
}

export function auditLogFilePath(empresaId: number, date: Date): string {
    return path.join(empresaLogsRoot(empresaId), monthFolderName(date), dayFileName(date));
}

export function sanitizeAuditValue(value: unknown): unknown {
    if (value == null) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeAuditValue(item));
    }

    if (typeof value !== "object") {
        return value;
    }

    const out: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
            out[key] = "[redacted]";
            continue;
        }

        out[key] = sanitizeAuditValue(nested);
    }

    return out;
}

export function diffAuditValues(
    before: Record<string, unknown> | null | undefined,
    after: Record<string, unknown> | null | undefined
): AuditChange[] {
    const changes: AuditChange[] = [];
    const keys = new Set([
        ...Object.keys(before ?? {}),
        ...Object.keys(after ?? {})
    ]);

    for (const field of keys) {
        const prev = before?.[field];
        const next = after?.[field];

        if (JSON.stringify(prev) === JSON.stringify(next)) {
            continue;
        }

        changes.push({ field, before: prev ?? null, after: next ?? null });
    }

    return changes;
}

function readDayFile(filePath: string): AuditLogEntry[] {
    if (!fs.existsSync(filePath)) {
        return [];
    }

    try {
        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw) as unknown;

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed as AuditLogEntry[];
    } catch {
        return [];
    }
}

function writeDayFile(filePath: string, entries: AuditLogEntry[]): void {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

export type WriteAuditInput = {
    actor: AuditActor;
    action: AuditAction;
    entity: string;
    entityId?: string;
    result?: AuditResult;
    before?: unknown;
    after?: unknown;
    request?: AuditRequestMeta;
    meta?: Record<string, unknown>;
    occurredAt?: string;
};

/**
 * Appends one audit entry to the empresa's day JSON file (UTC calendar day).
 */
export function appendAuditLog(empresaId: number, input: WriteAuditInput): AuditLogEntry {
    const occurredAt = input.occurredAt ?? new Date().toISOString();
    const occurredDate = new Date(occurredAt);
    const before =
        input.before == null
            ? null
            : (sanitizeAuditValue(input.before) as Record<string, unknown>);
    const after =
        input.after == null
            ? null
            : (sanitizeAuditValue(input.after) as Record<string, unknown>);

    const entry: AuditLogEntry = {
        id: crypto.randomUUID(),
        schemaVersion: AUDIT_SCHEMA_VERSION,
        occurredAt,
        actor: input.actor,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        result: input.result ?? "success",
        before,
        after,
        changes: diffAuditValues(before, after),
        request: input.request,
        meta: input.meta
    };

    const filePath = auditLogFilePath(empresaId, occurredDate);
    const existing = readDayFile(filePath);

    existing.push(entry);
    writeDayFile(filePath, existing);

    return entry;
}

function parseDayBound(value?: string): Date | null {
    if (!value?.trim()) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
    const next = new Date(date);

    next.setUTCDate(next.getUTCDate() + days);

    return next;
}

function* eachUtcDay(from: Date, to: Date): Generator<Date> {
    let cursor = startOfUtcDay(from);
    const end = startOfUtcDay(to);

    while (cursor.getTime() <= end.getTime()) {
        yield cursor;
        cursor = addUtcDays(cursor, 1);
    }
}

function matchesQuery(entry: AuditLogEntry, query: AuditListQuery): boolean {
    if (query.action && entry.action !== query.action) {
        return false;
    }

    if (query.entity && entry.entity !== query.entity) {
        return false;
    }

    if (query.actor) {
        const needle = query.actor.trim().toLowerCase();
        const hay = [
            entry.actor.id,
            entry.actor.name ?? "",
            entry.actor.email ?? "",
            entry.actor.type
        ]
            .join(" ")
            .toLowerCase();

        if (!hay.includes(needle)) {
            return false;
        }
    }

    if (query.q) {
        const needle = query.q.trim().toLowerCase();
        const hay = JSON.stringify(entry).toLowerCase();

        if (!hay.includes(needle)) {
            return false;
        }
    }

    return true;
}

/**
 * Lists audit entries for an empresa with filters and in-memory pagination.
 */
export function listAuditLogs(
    empresaId: number,
    query: AuditListQuery = {}
): { data: AuditLogEntry[]; total: number; page: number; limit: number } {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const now = new Date();
    const from = parseDayBound(query.from) ?? addUtcDays(now, -30);
    const to = parseDayBound(query.to) ?? now;
    const collected: AuditLogEntry[] = [];

    for (const day of eachUtcDay(from, to)) {
        const entries = readDayFile(auditLogFilePath(empresaId, day));

        for (const entry of entries) {
            if (matchesQuery(entry, query)) {
                collected.push(entry);
            }
        }
    }

    collected.sort((a, b) => {
        const sortRaw = query.sort?.trim();

        if (!sortRaw) {
            return b.occurredAt.localeCompare(a.occurredAt);
        }

        for (const token of sortRaw.split(",").map((part) => part.trim()).filter(Boolean)) {
            const descending = token.startsWith("-");
            const field = (descending ? token.slice(1) : token) as keyof AuditLogEntry;
            const left = String(a[field] ?? "");
            const right = String(b[field] ?? "");
            const cmp = left.localeCompare(right, "pt-BR", { numeric: true, sensitivity: "base" });

            if (cmp !== 0) {
                return descending ? -cmp : cmp;
            }
        }

        return 0;
    });

    const total = collected.length;
    const start = (page - 1) * limit;

    return {
        data: collected.slice(start, start + limit),
        total,
        page,
        limit
    };
}

export function getAuditLog(
    empresaId: number,
    id: string,
    occurredAt?: string
): AuditLogEntry | null {
    if (occurredAt) {
        const day = parseDayBound(occurredAt);

        if (day) {
            const found = readDayFile(auditLogFilePath(empresaId, day)).find(
                (entry) => entry.id === id
            );

            if (found) {
                return found;
            }
        }
    }

    const root = empresaLogsRoot(empresaId);

    if (!fs.existsSync(root)) {
        return null;
    }

    const months = fs
        .readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
        .reverse();

    for (const month of months) {
        const monthDir = path.join(root, month);
        const files = fs
            .readdirSync(monthDir)
            .filter((name) => name.endsWith(".json"))
            .sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));

        for (const file of files) {
            const found = readDayFile(path.join(monthDir, file)).find(
                (entry) => entry.id === id
            );

            if (found) {
                return found;
            }
        }
    }

    return null;
}

function parseMonthFolder(name: string): { year: number; month: number } | null {
    const match = /^(\d{2})_(\d{4})$/.exec(name);

    if (!match) {
        return null;
    }

    const month = Number(match[1]);
    const year = Number(match[2]);

    if (!Number.isInteger(month) || !Number.isInteger(year) || month < 1 || month > 12) {
        return null;
    }

    return { year, month };
}

/**
 * Deletes month folders older than the retention window for one empresa.
 */
export function purgeOldAuditLogs(
    empresaId: number,
    retentionMonths: number = AUDIT_RETENTION_MONTHS
): string[] {
    const root = empresaLogsRoot(empresaId);
    const removed: string[] = [];

    if (!fs.existsSync(root)) {
        return removed;
    }

    const now = new Date();
    const cutoff = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - retentionMonths, 1)
    );

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory()) {
            continue;
        }

        const parsed = parseMonthFolder(entry.name);

        if (!parsed) {
            continue;
        }

        const folderStart = new Date(Date.UTC(parsed.year, parsed.month - 1, 1));

        if (folderStart.getTime() >= cutoff.getTime()) {
            continue;
        }

        const target = path.join(root, entry.name);

        fs.rmSync(target, { recursive: true, force: true });
        removed.push(target);
    }

    return removed;
}

export function purgeAllEmpresasAuditLogs(
    retentionMonths: number = AUDIT_RETENTION_MONTHS
): string[] {
    const removed: string[] = [];

    for (const empresaId of listLocalEmpresaIds()) {
        removed.push(...purgeOldAuditLogs(empresaId, retentionMonths));
    }

    return removed;
}

export function removeEmpresaAuditLogs(empresaId: number): void {
    const root = empresaLogsRoot(empresaId);

    if (fs.existsSync(root)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
}
