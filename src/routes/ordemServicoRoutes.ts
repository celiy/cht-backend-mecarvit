import { Router } from "express";
import * as ordemServicoController from "../controllers/ordemServicoController.js";
import { requireAccess } from "../middlewares/requireAccess.js";
import { ACCESS } from "@shared/mecarvit/access";

export const statusOsRouter = Router();

statusOsRouter.get("/", ordemServicoController.listStatusOs);

export const ordemServicoRouter = Router();

ordemServicoRouter.use(requireAccess(ACCESS.OS));

ordemServicoRouter.route("/")
    .get(ordemServicoController.listOrdens)
    .post(ordemServicoController.createOs);

ordemServicoRouter.route("/:id")
    .get(ordemServicoController.getOs)
    .put(ordemServicoController.updateOs)
    .patch(ordemServicoController.updateOs)
    .delete(ordemServicoController.deleteOs);
