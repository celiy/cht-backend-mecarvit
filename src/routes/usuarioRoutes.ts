import { Router } from "express";
import * as usuarioController from "../controllers/usuarioController.js";
import { requireAccess } from "../middlewares/requireAccess.js";
import { ACCESS } from "@shared/mecarvit/access";

export const usuarioRouter = Router();

usuarioRouter.route("/")
    .get(requireAccess(ACCESS.FUNCIONARIOS), usuarioController.listUsuarios)
    .post(requireAccess(ACCESS.FUNCIONARIOS), usuarioController.createUsuario);

usuarioRouter.post("/:cpf/senha", usuarioController.changeSenha);

// `updateUsuario` owns the `/:cpf` authorization: it accepts self-edits and
// requires FUNCIONARIOS to touch somebody else. A route-level guard here would
// block every employee from saving their own profile.
usuarioRouter.route("/:cpf")
    .get(usuarioController.getUsuario)
    .put(usuarioController.updateUsuario)
    .patch(usuarioController.updateUsuario);
