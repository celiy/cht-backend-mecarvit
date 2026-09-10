import { Router } from "express";
import * as usuarioController from "../controllers/usuarioController.js";
import { requireAccess } from "../middlewares/requireAccess.js";
import { ACCESS } from "../db/schema/tables.js";

export const usuarioRouter = Router();

usuarioRouter.route("/")
    .get(requireAccess(ACCESS.FUNCIONARIOS), usuarioController.listUsuarios)
    .post(requireAccess(ACCESS.FUNCIONARIOS), usuarioController.createUsuario);

usuarioRouter.post("/:cpf/senha", usuarioController.changeSenha);

usuarioRouter.route("/:cpf")
    .get(usuarioController.getUsuario)
    .put(requireAccess(ACCESS.FUNCIONARIOS), usuarioController.updateUsuario)
    .patch(requireAccess(ACCESS.FUNCIONARIOS), usuarioController.updateUsuario);
