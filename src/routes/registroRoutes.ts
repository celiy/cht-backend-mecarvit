import { Router } from "express";
import * as registroController from "../controllers/registroController.js";
import { requireAccess } from "../middlewares/requireAccess.js";
import { ACCESS } from "../db/schema/tables.js";

export const registroRouter = Router();

registroRouter.use(requireAccess(ACCESS.OS));

registroRouter.route("/")
    .get(registroController.listRegistros)
    .post(registroController.createRegistro);

registroRouter.route("/:id")
    .get(registroController.getRegistro)
    .put(registroController.updateRegistro)
    .patch(registroController.updateRegistro)
    .delete(registroController.deleteRegistro);

export const dashboardRouter = Router();

dashboardRouter.get("/os-status", registroController.dashboardOsStatus);
dashboardRouter.get("/fluxo-mensal", registroController.dashboardFluxoMensal);
