import type { Request, Response } from 'express';
import type { CreateUserDTO } from '@shared/entities/User';
import { validateCreateUser } from '@shared/validators/user';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import { ApiFeatures } from '../utils/ApiFeatures.js';
import { getDatabase } from '../config/database.js';
import { users } from '../db/schema/users.js';
import * as userService from '../services/userService.js';

export const createUser = catchAsync(async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Partial<CreateUserDTO>;

    const validationErrors = validateCreateUser(body);
    if (validationErrors) {
        throw new AppError('Validação falhou', 400, validationErrors);
    }

    const created = await userService.createUser({
        name: body.name!,
        email: body.email!,
        password: body.password!,
    });

    res.status(201).json({ data: created });
});

export const listUsers = catchAsync(async (req: Request, res: Response) => {
    const db = getDatabase();

    const features = new ApiFeatures(db, users, req.query as Record<string, unknown>)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const rows = await features.exec();
    const total = await features.count();

    const sanitized = rows.map(row => {
        const { password: _pw, ...rest } = row as Record<string, unknown>;
        return rest;
    });

    res.status(200).json({
        data: sanitized,
        page: features.pagination.page,
        limit: features.pagination.limit,
        total,
    });
});

export const getUserById = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError('ID inválido', 400, { id: 'ID deve ser um inteiro positivo' });
    }

    const user = await userService.findUserById(id);

    if (!user) {
        throw new AppError('Usuário não encontrado', 404);
    }

    res.status(200).json({ data: user });
});
