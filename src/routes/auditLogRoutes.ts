import { Router } from "express";
import * as auditLogController from "../controllers/auditLogController.js";
import { requireAccess } from "../middlewares/requireAccess.js";
import { ACCESS } from "@shared/mecarvit/access";

export const auditLogRouter = Router();

auditLogRouter.use(requireAccess(ACCESS.SUPERADMIN));

auditLogRouter.get("/", auditLogController.listAuditLogsHandler);
auditLogRouter.get("/:id", auditLogController.getAuditLogHandler);
