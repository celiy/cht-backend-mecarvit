import cron from "node-cron";
import { purgeAllEmpresasAuditLogs } from "../services/auditLogService.js";

// 0 3 * * * -> purge audit logs older than 6 months at 03:00 UTC
cron.schedule("0 3 * * *", () => {
    try {
        const removed = purgeAllEmpresasAuditLogs();

        if (removed.length > 0) {
            console.log(`[audit] purged ${removed.length} month folder(s)`);
        }
    } catch (error) {
        console.error("[audit] purge failed:", error);
    }
});
