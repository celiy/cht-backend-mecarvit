import { Router } from "express";
import * as clienteController from "../controllers/clienteController.js";
import { requireAccess } from "../middlewares/requireAccess.js";
import { ACCESS } from "@shared/mecarvit/access";

export const clienteRouter = Router();

clienteRouter.use(requireAccess(ACCESS.CLIENTES));

clienteRouter.route("/")
    .get(clienteController.listClientes)
    .post(clienteController.createCliente);

clienteRouter.route("/:documento")
    .get(clienteController.getCliente)
    .put(clienteController.updateCliente)
    .patch(clienteController.updateCliente)
    .delete(clienteController.deleteCliente);
