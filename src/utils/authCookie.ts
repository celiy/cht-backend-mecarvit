import type { CookieOptions, Request, Response } from "express";
import { env } from "../config/env.js";

export const AUTH_COOKIE_NAME = "cht_auth";

const cookieBase: CookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/"
};

function headerToString(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
        return value.join("; ");
    }

    return value;
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
    const cookies: Record<string, string> = {};

    if (!header) {
        return cookies;
    }

    for (const part of header.split(";")) {
        const separator = part.indexOf("=");

        if (separator < 0) {
            continue;
        }

        const key = part.slice(0, separator).trim();

        if (!key) {
            continue;
        }

        cookies[key] = decodeURIComponent(part.slice(separator + 1).trim());
    }

    return cookies;
}

function maxAgeMs(): number {
    const match = /^(\d+)([smhd])$/.exec(String(env.jwt.expiresIn).trim());
    const amount = match?.[1] ? Number(match[1]) : NaN;
    const unit = match?.[2];

    if (!Number.isFinite(amount) || !unit) {
        return 7 * 24 * 60 * 60 * 1000;
    }

    const multipliers: Record<string, number> = {
        s: 1000,
        m: 60_000,
        h: 3_600_000,
        d: 86_400_000
    };

    return amount * (multipliers[unit] ?? 86_400_000);
}

export function setAuthCookie(res: Response, token: string): void {
    res.cookie(AUTH_COOKIE_NAME, token, {
        ...cookieBase,
        maxAge: maxAgeMs()
    });
}

export function clearAuthCookie(res: Response): void {
    res.clearCookie(AUTH_COOKIE_NAME, cookieBase);
}

export function readAuthToken(req: Pick<Request, "headers" | "cookies">): string | null {
    const fromParser = req.cookies?.[AUTH_COOKIE_NAME];

    if (typeof fromParser === "string" && fromParser) {
        return fromParser;
    }

    const fromHeader = parseCookieHeader(headerToString(req.headers.cookie))[AUTH_COOKIE_NAME];

    if (fromHeader) {
        return fromHeader;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.slice("Bearer ".length).trim();

    return token || null;
}
