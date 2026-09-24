import { Router } from "express";
import * as servicoController from "../controllers/servicoController.js";
import { requireAccess } from "../middlewares/requireAccess.js";
import { ACCESS, PERMISSIONS } from "@shared/mecarvit/access";

export const servicoRouter = Router();

servicoRouter.route("/")
    .get(requireAccess(PERMISSIONS.os.ver), servicoController.listServicos)
    .post(requireAccess(ACCESS.OS), servicoController.createServico);

servicoRouter.route("/:id")
    .get(requireAccess(PERMISSIONS.os.ver), servicoController.getServico)
    .put(requireAccess(ACCESS.OS), servicoController.updateServico)
    .patch(requireAccess(ACCESS.OS), servicoController.updateServico)
    .delete(requireAccess(PERMISSIONS.os.excluir), servicoController.deleteServico);
