import { Router } from "express";
import * as servicoController from "../controllers/servicoController.js";
import { requireAccess } from "../middlewares/requireAccess.js";
import { ACCESS } from "../db/schema/tables.js";

export const servicoRouter = Router();

servicoRouter.use(requireAccess(ACCESS.OS));

servicoRouter.route("/")
    .get(servicoController.listServicos)
    .post(servicoController.createServico);

servicoRouter.route("/:id")
    .get(servicoController.getServico)
    .put(servicoController.updateServico)
    .patch(servicoController.updateServico)
    .delete(servicoController.deleteServico);
