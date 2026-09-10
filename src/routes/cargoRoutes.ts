import { Router } from "express";
import * as cargoController from "../controllers/cargoController.js";
import { requireAccess } from "../middlewares/requireAccess.js";
import { ACCESS } from "../db/schema/tables.js";

export const cargoRouter = Router();

cargoRouter.use(requireAccess(ACCESS.FUNCIONARIOS));

cargoRouter.route("/")
    .get(cargoController.listCargos)
    .post(cargoController.createCargo);

cargoRouter.route("/:id")
    .get(cargoController.getCargo)
    .put(cargoController.updateCargo)
    .patch(cargoController.updateCargo)
    .delete(cargoController.deleteCargo);
