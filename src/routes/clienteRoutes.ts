import { Router } from "express";
import * as clienteController from "../controllers/clienteController.js";
import { requireAccess } from "../middlewares/requireAccess.js";
import { ACCESS, PERMISSIONS } from "@shared/mecarvit/access";

export const clienteRouter = Router();

clienteRouter.route("/")
    .get(requireAccess(PERMISSIONS.clientes.ver), clienteController.listClientes)
    .post(requireAccess(PERMISSIONS.clientes.criar), clienteController.createCliente);

clienteRouter.route("/:documento")
    .get(requireAccess(PERMISSIONS.clientes.ver), clienteController.getCliente)
    .put(requireAccess(ACCESS.CLIENTES), clienteController.updateCliente)
    .patch(requireAccess(ACCESS.CLIENTES), clienteController.updateCliente)
    .delete(requireAccess(PERMISSIONS.clientes.excluir), clienteController.deleteCliente);
