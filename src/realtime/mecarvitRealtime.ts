import type { IncomingMessage, Server as HttpServer } from "node:http";
import { CADASTRO_ENTITY_LABEL, type CadastroRealtimePayload } from "@shared/mecarvit/realtime";
import { isSuperadmin } from "@shared/mecarvit/access";
import { empresaExists, openCompany } from "../config/database.js";
import * as usuarioService from "../services/usuarioService.js";
import { verifyToken } from "../utils/jwt.js";
import type { PublicUsuario } from "../entities/Usuario.js";
import type { Request } from "express";
import { createWsHub, type WsHub } from "./createWsHub.js";
import { publishRealtime, setRealtimeHub } from "./registry.js";

export function superadminTopic(empresaId: number): string {
    return `empresa:${empresaId}:superadmin`;
}

export function topicsForUsuario(user: PublicUsuario): string[] {
    const topics = [`user:${user.cpf}`, `empresa:${user.empresaId}`];

    if (isSuperadmin(user.nivelAcesso)) {
        topics.push(superadminTopic(user.empresaId));
    }

    return topics;
}

export async function authenticateMecarvitSocket(
    token: string,
    _request: IncomingMessage
): Promise<{ id: string; topics: string[] } | null> {
    void _request;

    let payload;

    try {
        payload = verifyToken(token);
    } catch {
        return null;
    }

    if (!empresaExists(payload.empresaId)) {
        return null;
    }

    const db = openCompany(payload.empresaId);
    const user = await usuarioService.findPublicByCpf(db, payload.sub);

    if (!user || !user.ativo) {
        return null;
    }

    return {
        id: user.cpf,
        topics: topicsForUsuario(user)
    };
}

export function notifyStaffCadastro(req: Request, entity: string): void {
    const user = req.user;
    const empresaId = req.empresaId;

    if (!user || empresaId === undefined) {
        return;
    }

    if (isSuperadmin(user.nivelAcesso)) {
        return;
    }

    const payload: CadastroRealtimePayload = {
        kind: "cadastro",
        entity,
        actorNome: user.nome,
        actorCpf: user.cpf,
        label: CADASTRO_ENTITY_LABEL[entity] ?? entity
    };

    publishRealtime(superadminTopic(empresaId), payload);
}

export function attachMecarvitRealtime(server: HttpServer): WsHub {
    const hub = createWsHub({
        authenticate: authenticateMecarvitSocket
    });

    setRealtimeHub(hub);
    hub.attach(server);

    return hub;
}
