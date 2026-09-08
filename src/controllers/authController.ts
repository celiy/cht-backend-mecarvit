import type { Request, Response } from "express";
import type { CreateUserDTO } from "../entities/User.js";
import { validateCreateUser } from "@shared/validators/user";
import { validateLogin } from "@shared/validators/auth";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";
import * as authService from "../services/authService.js";

export const register = catchAsync(async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Partial<CreateUserDTO>;
    const validationErrors = validateCreateUser(body);

    if (validationErrors) {
        throw new AppError("Validação falhou", 400, validationErrors);
    }

    const result = await authService.registerUser({
        name: body.name!,
        email: body.email!,
        password: body.password!,
    });

    res.status(201).json({ data: result });
});

export const login = catchAsync(async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { email?: string; password?: string };
    const validationErrors = validateLogin(body);

    if (validationErrors) {
        throw new AppError("Validação falhou", 400, validationErrors);
    }

    const result = await authService.loginUser(body.email!, body.password!);

    res.status(200).json({ data: result });
});

export const me = catchAsync(async (req: Request, res: Response) => {
    res.status(200).json({ data: req.user });
});
