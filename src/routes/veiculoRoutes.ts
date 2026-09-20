import { Router } from "express";
import * as veiculoController from "../controllers/veiculoController.js";
import { requireAccess } from "../middlewares/requireAccess.js";
import { ACCESS } from "@shared/mecarvit/access";

export const veiculoRouter = Router();

veiculoRouter.use(requireAccess(ACCESS.VEICULOS));

veiculoRouter.route("/")
    .get(veiculoController.listVeiculos)
    .post(veiculoController.createVeiculo);

veiculoRouter.route("/:id")
    .get(veiculoController.getVeiculo)
    .put(veiculoController.updateVeiculo)
    .patch(veiculoController.updateVeiculo)
    .delete(veiculoController.deleteVeiculo);
