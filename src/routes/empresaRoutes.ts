import { Router } from "express";
import * as empresaController from "../controllers/empresaController.js";

export const empresaRouter = Router();

empresaRouter.get("/", empresaController.getEmpresaAtual);

empresaRouter.route("/:id")
    .get(empresaController.getEmpresa)
    .put(empresaController.updateEmpresa)
    .patch(empresaController.updateEmpresa);
