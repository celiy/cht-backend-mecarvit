import "dotenv/config";

function required(name: string, fallback?: string): string {
    const value = process.env[name] ?? fallback;

    if (value === undefined || value === "") {
        throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
    }

    return value;
}

function parsePort(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseList(value: string | undefined): string[] {
    if (!value) return [];
    return value.split(",").map(v => v.trim()).filter(Boolean);
}

export const env = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    isProduction: process.env.NODE_ENV === "production",
    host: process.env.HOST ?? "127.0.0.1",
    port: parsePort(process.env.PORT, 8000),
    dbPath: process.env.DB_PATH ?? "./data/mecarvit.sqlite",
    jwt: {
        secret: required("JWT_SECRET", "change-me-please"),
        expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
    },
    corsOrigins: parseList(process.env.CORS_ORIGINS) ?? [],
} as const;
