import jwt, { type JwtPayload as JsonWebTokenPayload, type Secret, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AuthJwtPayload {
    sub: string;
    email: string;
    empresaId: number;
}

export function signToken(payload: AuthJwtPayload): string {
    const options: SignOptions = {
        expiresIn: env.jwt.expiresIn as SignOptions["expiresIn"]
    };

    return jwt.sign(payload, env.jwt.secret as Secret, options);
}

export function verifyToken(token: string): AuthJwtPayload {
    const decoded = jwt.verify(token, env.jwt.secret as Secret) as JsonWebTokenPayload & AuthJwtPayload;
    const sub = String(decoded.sub ?? "");
    const email = String(decoded.email ?? "");
    const empresaId = Number(decoded.empresaId);

    if (!sub || !email || !Number.isInteger(empresaId) || empresaId <= 0) {
        throw new Error("Token inválido");
    }

    return { sub, email, empresaId };
}

export interface SystemJwtPayload {
    typ: "system";
    sub: string;
}

export function signSystemToken(login: string): string {
    const options: SignOptions = {
        expiresIn: env.jwt.expiresIn as SignOptions["expiresIn"]
    };

    return jwt.sign({ typ: "system", sub: login }, env.jwt.secret as Secret, options);
}

export function verifySystemToken(token: string): SystemJwtPayload {
    const decoded = jwt.verify(token, env.jwt.secret as Secret) as JsonWebTokenPayload & {
        typ?: string;
        sub?: string;
    };

    if (decoded.typ !== "system" || !decoded.sub) {
        throw new Error("Token inválido");
    }

    return { typ: "system", sub: String(decoded.sub) };
}
