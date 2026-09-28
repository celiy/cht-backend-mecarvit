import { Router } from "express";
import * as dashboardController from "../controllers/dashboardController.js";
import { requireGerente } from "../middlewares/requireGerente.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireGerente);

dashboardRouter.get("/financeiro-cards", dashboardController.financeiroCards);
dashboardRouter.get("/fluxo-pago", dashboardController.fluxoPago);
dashboardRouter.get("/os-status", dashboardController.osStatus);
dashboardRouter.get("/os-pagamento", dashboardController.osPagamento);
