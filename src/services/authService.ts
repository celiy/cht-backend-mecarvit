import bcrypt from "bcrypt";
import type { CreateUserDTO, PublicUser } from "../entities/User.js";
import { AppError } from "../utils/AppError.js";
import { signToken } from "../utils/jwt.js";
import * as userService from "./userService.js";

export interface AuthResult {
    user: PublicUser;
    token: string;
}

export async function registerUser(dto: CreateUserDTO): Promise<AuthResult> {
    const existing = await userService.findUserByEmail(dto.email);

    if (existing) {
        throw new AppError("Validação falhou", 409, { email: "Email já cadastrado" });
    }

    const user = await userService.createUser(dto);
    const token = signToken({ sub: user.id, email: user.email });

    return { user, token };
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
    const user = await userService.findUserByEmail(email);

    if (!user) {
        throw new AppError("Credenciais inválidas", 401, {
            email: "Email ou senha incorretos",
        });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
        throw new AppError("Credenciais inválidas", 401, {
            password: "Email ou senha incorretos",
        });
    }

    const token = signToken({ sub: user.id, email: user.email });

    return {
        user: userService.toPublic(user),
        token,
    };
}
