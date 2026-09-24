import "dotenv/config";

export const JWT_SECRET_PLACEHOLDER = "change-me-please";

/**
 * Production must set a unique secret. The example placeholder is only
 * allowed in local/dev so a missing env var cannot mint forgeable tokens.
 */
export function resolveJwtSecret(
    secret: string | undefined,
    nodeEnv: string = process.env.NODE_ENV ?? "development"
): string {
    const trimmed = secret?.trim() ?? "";
    const isProduction = nodeEnv === "production";

    if (!trimmed) {
        if (isProduction) {
            throw new Error("Variável de ambiente obrigatória ausente: JWT_SECRET");
        }

        return JWT_SECRET_PLACEHOLDER;
    }

    if (isProduction && trimmed === JWT_SECRET_PLACEHOLDER) {
        throw new Error(
            "JWT_SECRET em produção não pode ser o valor de exemplo. Defina um segredo único."
        );
    }

    return trimmed;
}

function parsePort(value: string | undefined, fallback: number): number {
    if (value === "0") {
        return 0;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseList(value: string | undefined): string[] {
    if (!value) return [];
    return value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
}

export const env = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    isProduction: process.env.NODE_ENV === "production",
    host: process.env.HOST ?? "127.0.0.1",
    port: parsePort(process.env.PORT, 3001),
    portScanLimit: parsePort(process.env.PORT_SCAN_LIMIT, 20),
    dbPath: process.env.DB_PATH ?? "./data/mecarvit.sqlite",
    empresasDir: process.env.EMPRESAS_DIR ?? "./data/empresas",
    jwt: {
        secret: resolveJwtSecret(process.env.JWT_SECRET),
        expiresIn: process.env.JWT_EXPIRES_IN ?? "7d"
    },
    corsOrigins: parseList(process.env.CORS_ORIGINS) ?? []
} as const;
