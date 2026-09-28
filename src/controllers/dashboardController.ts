import type { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { requireDb } from "../utils/http.js";
import * as dashboardService from "../services/dashboardService.js";

export const financeiroCards = catchAsync(async (req: Request, res: Response) => {
    const periodo = dashboardService.parseDashboardPeriodo(req.query.periodo);
    const data = await dashboardService.financeiroCards(requireDb(req), periodo);

    res.status(200).json({ data });
});

export const fluxoPago = catchAsync(async (req: Request, res: Response) => {
    const meses = dashboardService.parseDashboardMeses(req.query.meses);
    const tipo = dashboardService.parseFluxoPagoTipo(req.query.tipo);
    const data = await dashboardService.fluxoPago(requireDb(req), meses, tipo);

    res.status(200).json({ data });
});

export const osStatus = catchAsync(async (req: Request, res: Response) => {
    const periodo = dashboardService.parseDashboardPeriodo(req.query.periodo);
    const data = await dashboardService.osPorStatus(requireDb(req), periodo);

    res.status(200).json({ data });
});

export const osPagamento = catchAsync(async (req: Request, res: Response) => {
    const periodo = dashboardService.parseDashboardPeriodo(req.query.periodo);
    const data = await dashboardService.osPorPagamento(requireDb(req), periodo);

    res.status(200).json({ data });
});
