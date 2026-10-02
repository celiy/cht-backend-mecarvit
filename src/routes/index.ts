import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { protect } from "../middlewares/protect.js";
import { requirePasswordChanged } from "../middlewares/requireAccess.js";
import { usuarioRouter } from "./usuarioRoutes.js";
import { cargoRouter } from "./cargoRoutes.js";
import { empresaRouter } from "./empresaRoutes.js";
import { clienteRouter } from "./clienteRoutes.js";
import { enderecoRouter } from "./enderecoRoutes.js";
import { veiculoRouter } from "./veiculoRoutes.js";
import { servicoRouter } from "./servicoRoutes.js";
import { ordemServicoRouter, statusOsRouter } from "./ordemServicoRoutes.js";
import { registroRouter } from "./registroRoutes.js";
import { dashboardRouter } from "./dashboardRoutes.js";
import { auditLogRouter } from "./auditLogRoutes.js";

export const apiRouter = Router();

apiRouter.post("/cadastro", authController.cadastro);
apiRouter.post("/login", authController.login);
apiRouter.post("/logout", authController.logout);
apiRouter.get("/empresa-locais", authController.empresaLocais);

const privateRouter = Router();

privateRouter.use(protect);
privateRouter.use(requirePasswordChanged);

privateRouter.get("/me", authController.me);
privateRouter.use("/usuario", usuarioRouter);
privateRouter.use("/cargo", cargoRouter);
privateRouter.use("/empresa", empresaRouter);
privateRouter.use("/cliente", clienteRouter);
privateRouter.use("/endereco", enderecoRouter);
privateRouter.use("/veiculo", veiculoRouter);
privateRouter.use("/servico", servicoRouter);
privateRouter.use("/status-os", statusOsRouter);
privateRouter.use("/ordem-servico", ordemServicoRouter);
privateRouter.use("/regentradasaida", registroRouter);
privateRouter.use("/dashboard", dashboardRouter);
privateRouter.use("/audit-logs", auditLogRouter);

apiRouter.use(privateRouter);
