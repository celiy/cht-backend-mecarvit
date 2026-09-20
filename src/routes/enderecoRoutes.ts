import { Router } from "express";
import * as enderecoController from "../controllers/enderecoController.js";
import { requireAccess } from "../middlewares/requireAccess.js";
import { ACCESS } from "@shared/mecarvit/access";

export const enderecoRouter = Router();

enderecoRouter.use(requireAccess(ACCESS.CLIENTES));

enderecoRouter.route("/")
    .get(enderecoController.listEnderecos)
    .post(enderecoController.createEndereco);

enderecoRouter.route("/:id")
    .get(enderecoController.getEndereco)
    .put(enderecoController.updateEndereco);
