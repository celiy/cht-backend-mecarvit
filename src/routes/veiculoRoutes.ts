import { Router } from "express";
import * as veiculoController from "../controllers/veiculoController.js";
import { requireAccess } from "../middlewares/requireAccess.js";
import { ACCESS, PERMISSIONS } from "@shared/mecarvit/access";

export const veiculoRouter = Router();

veiculoRouter.route("/")
    .get(requireAccess(PERMISSIONS.veiculos.ver), veiculoController.listVeiculos)
    .post(requireAccess(PERMISSIONS.veiculos.criar), veiculoController.createVeiculo);

veiculoRouter.route("/:id")
    .get(requireAccess(PERMISSIONS.veiculos.ver), veiculoController.getVeiculo)
    .put(requireAccess(ACCESS.VEICULOS), veiculoController.updateVeiculo)
    .patch(requireAccess(ACCESS.VEICULOS), veiculoController.updateVeiculo)
    .delete(requireAccess(PERMISSIONS.veiculos.excluir), veiculoController.deleteVeiculo);
