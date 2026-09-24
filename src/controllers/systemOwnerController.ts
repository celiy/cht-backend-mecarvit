import type { Request, Response } from "express";
import { validateSystemOwnerCredentials } from "@shared/validators/auth";
import { catchAsync } from "../utils/catchAsync.js";
import { throwIfInvalid, bodyOf } from "../utils/validate.js";
import * as systemOwnerService from "../services/systemOwnerService.js";

export const status = catchAsync(async (_req: Request, res: Response) => {
    res.status(200).json({ data: systemOwnerService.systemOwnerStatus() });
});

export const setup = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);
    throwIfInvalid(validateSystemOwnerCredentials({
        login: body.login as string,
        senha: (body.senha ?? body.password) as string
    }));

    const result = systemOwnerService.setupSystemOwner(
        String(body.login),
        String(body.senha ?? body.password)
    );

    res.status(201).json({ data: result });
});

export const login = catchAsync(async (req: Request, res: Response) => {
    const body = bodyOf(req);
    throwIfInvalid(validateSystemOwnerCredentials({
        login: body.login as string,
        senha: (body.senha ?? body.password) as string
    }));

    const result = await systemOwnerService.loginSystemOwner(
        String(body.login),
        String(body.senha ?? body.password)
    );

    res.status(200).json({ data: result });
});
