import type { Request } from "express";
import {
    appendAuditLog,
    type AuditActor,
    type AuditLogEntry,
    type WriteAuditInput
} from "../services/auditLogService.js";

type AuthUserLike = {
    cpf?: string;
    nome?: string;
    email?: string | null;
};

/**
 * Builds the audit actor from the authenticated request, or `"sistema"`.
 */
export function auditActorFromRequest(req: Request): AuditActor {
    const user = req.user as AuthUserLike | undefined;

    if (!user?.cpf) {
        return {
            type: "system",
            id: "sistema",
            name: "Sistema"
        };
    }

    return {
        type: "user",
        id: user.cpf,
        name: user.nome,
        email: user.email ?? undefined
    };
}

function requestMeta(req: Request): WriteAuditInput["request"] {
    const forwarded = req.headers["x-forwarded-for"];
    const forwardedIp =
        typeof forwarded === "string"
            ? forwarded.split(",")[0]?.trim()
            : Array.isArray(forwarded)
              ? forwarded[0]
              : undefined;

    return {
        method: req.method,
        path: req.originalUrl || req.url,
        ip: forwardedIp || req.ip,
        userAgent: req.get("user-agent") ?? undefined,
        requestId: req.requestedAt
    };
}

/**
 * Writes an audit entry for the current empresa. No-ops without `empresaId`.
 */
export function recordAudit(
    req: Request,
    input: Omit<WriteAuditInput, "actor" | "request"> & {
        actor?: AuditActor;
        request?: WriteAuditInput["request"];
    }
): AuditLogEntry | null {
    const empresaId = req.empresaId;

    if (empresaId == null) {
        return null;
    }

    return appendAuditLog(empresaId, {
        ...input,
        actor: input.actor ?? auditActorFromRequest(req),
        request: input.request ?? requestMeta(req)
    });
}
