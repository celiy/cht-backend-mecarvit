import bcrypt from "bcrypt";
import { AppError } from "../utils/AppError.js";
import { signSystemToken } from "../utils/jwt.js";
import {
    hashSystemOwnerPassword,
    isSystemOwnerConfigured,
    persistSystemOwner
} from "../config/systemOwnerEnv.js";

export function systemOwnerStatus() {
    const configured = isSystemOwnerConfigured();

    return {
        configured,
        required: configured
    };
}

export function setupSystemOwner(login: string, senha: string) {
    if (isSystemOwnerConfigured()) {
        throw new AppError("Dono do sistema já foi configurado", 409);
    }

    persistSystemOwner(login.trim(), hashSystemOwnerPassword(senha));

    return {
        token: signSystemToken(login.trim()),
        login: login.trim()
    };
}

export async function loginSystemOwner(login: string, senha: string) {
    const expectedLogin = process.env.SYSTEM_OWNER_LOGIN?.trim() ?? "";
    const expectedHash = process.env.SYSTEM_OWNER_PASSWORD_HASH?.trim() ?? "";

    if (!expectedLogin || !expectedHash) {
        throw new AppError("Dono do sistema não configurado", 404);
    }

    const loginMatches = login.trim() === expectedLogin;
    const passwordMatches = await bcrypt.compare(senha, expectedHash);

    if (!loginMatches || !passwordMatches) {
        throw new AppError("Credenciais inválidas", 401);
    }

    return {
        token: signSystemToken(expectedLogin),
        login: expectedLogin
    };
}
