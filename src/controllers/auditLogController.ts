import type { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";
import { getAuditLog, listAuditLogs } from "../services/auditLogService.js";

export const listAuditLogsHandler = catchAsync(async (req: Request, res: Response) => {
    const empresaId = req.empresaId;

    if (empresaId == null) {
        throw new AppError("Empresa não encontrada", 400);
    }

    const result = listAuditLogs(empresaId, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        action: typeof req.query.action === "string" ? req.query.action : undefined,
        actor: typeof req.query.actor === "string" ? req.query.actor : undefined,
        entity: typeof req.query.entity === "string" ? req.query.entity : undefined,
        from: typeof req.query.from === "string" ? req.query.from : undefined,
        to: typeof req.query.to === "string" ? req.query.to : undefined,
        q: typeof req.query.q === "string" ? req.query.q : undefined
    });

    res.status(200).json(result);
});

export const getAuditLogHandler = catchAsync(async (req: Request, res: Response) => {
    const empresaId = req.empresaId;

    if (empresaId == null) {
        throw new AppError("Empresa não encontrada", 400);
    }

    const id = String(req.params.id);
    const occurredAt =
        typeof req.query.occurredAt === "string" ? req.query.occurredAt : undefined;
    const entry = getAuditLog(empresaId, id, occurredAt);

    if (!entry) {
        throw new AppError("Log não encontrado", 404);
    }

    res.status(200).json({ data: entry });
});
