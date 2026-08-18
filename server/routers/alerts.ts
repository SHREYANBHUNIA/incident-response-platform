import { z } from "zod";
import { createAuditLog, listAlerts, listAuditLogs, updateAlertStatus } from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { buildStatusAudit } from "../services/auditService";
import { ingestAlert } from "../services/incidentService";

const AlertInputSchema = z.object({
  source: z.string().min(1).max(255),
  severity: z.enum(["info", "warning", "error", "critical"]),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.coerce.date().optional(),
});

export const alertsRouter = router({
  list: publicProcedure.input(z.object({ limit: z.number().min(1).max(250).optional(), status: z.enum(["active", "acknowledged", "resolved", "suppressed"]).optional() }).optional()).query(({ input }) => listAlerts(input?.limit ?? 100, input?.status)),
  ingest: publicProcedure.input(AlertInputSchema).mutation(({ input, ctx }) => ingestAlert(input, ctx.user?.id)),
  updateStatus: publicProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["active", "acknowledged", "resolved", "suppressed"]) })).mutation(async ({ input, ctx }) => {
    const updated = await updateAlertStatus(input.id, input.status);
    await createAuditLog(buildStatusAudit({ entityType: "alert", entityId: input.id, status: input.status, channel: "dashboard", userId: ctx.user?.id }));
    return updated;
  }),
  audit: publicProcedure.input(z.object({ id: z.number().int().positive(), limit: z.number().min(1).max(100).default(50) })).query(({ input }) => listAuditLogs("alert", input.id, input.limit)),
});
