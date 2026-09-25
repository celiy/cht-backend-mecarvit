import type { NextFunction, Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { PrettyConsole } from "@shared/terminal/prettyConsole";

export const actionLogger = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const prettyConsole = new PrettyConsole();
    prettyConsole.closeByNewLine = false;

    const dayMonthYear = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });

    const hourMinuteSecond = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    const user: { ip?: string; user?: string; empresaId?: number } = {};
    let log = "";

    if (req.ip) {
        user.ip = req.ip;

        if (req.user) {
            user.user = req.user.nome;
            user.empresaId = req.empresaId;

            log = `/ ${user.ip} - ${user.user} - ${user.empresaId}`;
        } else {
            log = `/ ${user.ip}`;
        }
    }

    let statusColor: string;

    if (res.statusCode >= 200 && res.statusCode < 300) {
        statusColor = "green";
    } else if (res.statusCode >= 400 && res.statusCode < 500) {
        statusColor = "yellow";
    } else if (res.statusCode >= 500) {
        statusColor = "red";
    } else {
        statusColor = "white";
    }

    prettyConsole.print([
        { value: `[${dayMonthYear} - ${hourMinuteSecond}]`, fg: "blue" },
        { value: ` ${req.method} ${req.url}`, fg: "white" },
        { value: " - ", fg: "white" },
        { value: `${res.statusCode}`, fg: statusColor },
        { value: ` ${log}`, fg: "magenta" }
    ]);

    next();
});
