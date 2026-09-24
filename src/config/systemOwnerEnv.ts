import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcrypt";

export const SYSTEM_OWNER_SETUP_FILENAME = "system-owner.setup";
export const SYSTEM_TOKEN_HEADER = "x-cht-system-token";
export const JWT_SECRET_PLACEHOLDER = "change-me-please";

export function isSystemOwnerConfigured(): boolean {
    return Boolean(
        process.env.SYSTEM_OWNER_LOGIN?.trim() && process.env.SYSTEM_OWNER_PASSWORD_HASH?.trim()
    );
}

export function systemEnvPath(): string {
    if (process.env.SYSTEM_ENV_PATH?.trim()) {
        return process.env.SYSTEM_ENV_PATH.trim();
    }

    return path.resolve(process.cwd(), ".env");
}

export function systemOwnerSetupPath(): string | null {
    if (process.env.SYSTEM_OWNER_SETUP_PATH?.trim()) {
        return process.env.SYSTEM_OWNER_SETUP_PATH.trim();
    }

    return null;
}

function bcryptRounds(): number {
    const parsed = Number(process.env.BCRYPT_ROUNDS ?? 12);

    return Number.isFinite(parsed) && parsed >= 4 ? parsed : 12;
}

function parseSetupFile(text: string): { login: string; password: string } | null {
    const map: Record<string, string> = {};

    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const index = trimmed.indexOf("=");

        if (index <= 0) {
            continue;
        }

        const key = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1);

        map[key] = value;
    }

    const login = (map.login ?? map.LOGIN ?? "").trim();
    const password = map.password ?? map.PASSWORD ?? map.senha ?? "";

    if (!login || !password) {
        return null;
    }

    return { login, password };
}

export function upsertEnvFile(filePath: string, updates: Record<string, string>): void {
    let existing = "";

    if (fs.existsSync(filePath)) {
        existing = fs.readFileSync(filePath, "utf8");
    }

    const keys = new Set(Object.keys(updates));
    const kept = existing.split(/\r?\n/).filter((line) => {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) {
            return true;
        }

        const key = trimmed.split("=")[0]?.trim() ?? "";

        return !keys.has(key);
    });

    while (kept.length > 0 && kept[kept.length - 1] === "") {
        kept.pop();
    }

    for (const [key, value] of Object.entries(updates)) {
        kept.push(`${key}=${value}`);
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${kept.join("\n")}\n`, { encoding: "utf8", mode: 0o600 });
}

export function hashSystemOwnerPassword(password: string): string {
    return bcrypt.hashSync(password, bcryptRounds());
}

export function persistSystemOwner(login: string, passwordHash: string): void {
    process.env.SYSTEM_OWNER_LOGIN = login;
    process.env.SYSTEM_OWNER_PASSWORD_HASH = passwordHash;

    const updates: Record<string, string> = {
        SYSTEM_OWNER_LOGIN: login,
        SYSTEM_OWNER_PASSWORD_HASH: passwordHash
    };
    const currentSecret = process.env.JWT_SECRET?.trim() ?? "";

    if (!currentSecret || currentSecret === JWT_SECRET_PLACEHOLDER) {
        const secret = crypto.randomBytes(48).toString("hex");

        process.env.JWT_SECRET = secret;
        updates.JWT_SECRET = secret;
    }

    upsertEnvFile(systemEnvPath(), updates);
}

export function consumeInstallerOwnerSetup(): void {
    if (isSystemOwnerConfigured()) {
        return;
    }

    const setupPath = systemOwnerSetupPath();

    if (!setupPath || !fs.existsSync(setupPath)) {
        return;
    }

    const parsed = parseSetupFile(fs.readFileSync(setupPath, "utf8"));

    if (!parsed) {
        fs.unlinkSync(setupPath);
        return;
    }

    persistSystemOwner(parsed.login, hashSystemOwnerPassword(parsed.password));
    fs.unlinkSync(setupPath);
}
