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

export const osReabertas = catchAsync(async (req: Request, res: Response) => {
    const periodo = dashboardService.parseDashboardPeriodo(req.query.periodo);
    const data = await dashboardService.osReabertasChart(requireDb(req), periodo);

    res.status(200).json({ data });
});

export const osReabertasList = catchAsync(async (req: Request, res: Response) => {
    const periodo = dashboardService.parseDashboardPeriodo(req.query.periodo);
    const bucket = typeof req.query.bucket === "string" ? req.query.bucket.trim() : "";
    const page = Number(req.query.page);
    const limit = Number(req.query.limit);
    const data = await dashboardService.listOsReabertas(requireDb(req), periodo, {
        bucket: bucket || undefined,
        page: Number.isInteger(page) && page > 0 ? page : 1,
        limit: Number.isInteger(limit) && limit > 0 ? limit : 10
    });

    res.status(200).json({ data });
});
