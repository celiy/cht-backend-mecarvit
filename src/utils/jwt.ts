import jwt, { type JwtPayload as JsonWebTokenPayload, type Secret, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AuthJwtPayload {
    sub: number;
    email: string;
}

export function signToken(payload: AuthJwtPayload): string {
    const options: SignOptions = {
        expiresIn: env.jwt.expiresIn as SignOptions["expiresIn"],
    };

    return jwt.sign(payload, env.jwt.secret as Secret, options);
}

export function verifyToken(token: string): AuthJwtPayload {
    const decoded = jwt.verify(token, env.jwt.secret as Secret) as JsonWebTokenPayload & AuthJwtPayload;

    const sub = Number(decoded.sub);
    const email = String(decoded.email ?? "");

    if (!Number.isInteger(sub) || sub <= 0 || !email) {
        throw new Error("Token inválido");
    }

    return { sub, email };
}
