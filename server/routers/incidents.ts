import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createAuditLog, getClusterForIncident, getIncidentAlerts, getIncidentById, listAuditLogs, listIncidents, updateIncident } from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { buildStatusAudit } from "../services/auditService";
import { runMultiAgentRCA } from "../services/multiAgentRCA";
import { sendSlackIncidentNotification } from "../services/slackService";

function timelineFromAlerts(alerts: Awaited<ReturnType<typeof getIncidentAlerts>>) {
  return alerts.map((alert, index) => ({
    at: alert.timestamp.toISOString(),
    label: index === 0 ? "Initial signal" : `${alert.source} correlation`,
    detail: alert.message,
  }));
}

async function shapeIncident(incident: NonNullable<Awaited<ReturnType<typeof getIncidentById>>>) {
  const incidentAlerts = await getIncidentAlerts(incident.id);
  const cluster = await getClusterForIncident(incident.id);
  return { ...incident, alerts: incidentAlerts, timeline: timelineFromAlerts(incidentAlerts), cluster };
}

export const incidentsRouter = router({
  list: publicProcedure.input(z.object({ limit: z.number().min(1).max(100).optional() }).optional()).query(async ({ input }) => {
    const rows = await listIncidents(input?.limit ?? 50);
    return Promise.all(rows.map(shapeIncident));
  }),
  detail: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const incident = await getIncidentById(input.id);
    if (!incident) throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found" });
    return shapeIncident(incident);
  }),
  runRca: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const incident = await getIncidentById(input.id);
    if (!incident) throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found" });
    const incidentAlerts = await getIncidentAlerts(input.id);
    const rca = await runMultiAgentRCA(incidentAlerts);
    const updated = await updateIncident(input.id, { rootCause: rca.rootCause, aiExplanation: rca.explanation, suggestedFixes: rca.suggestedFixes });
    await createAuditLog({ entityType: "incident", entityId: input.id, action: "incident_rca_refreshed", userId: ctx.user?.id ?? null, details: { confidence: rca.confidence } });
    return updated ? shapeIncident(updated) : null;
  }),
  updateStatus: publicProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "acknowledged", "resolved", "suppressed"]) })).mutation(async ({ input, ctx }) => {
    const incident = await getIncidentById(input.id);
    if (!incident) throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found" });
    const updated = await updateIncident(input.id, { status: input.status, endTime: input.status === "resolved" ? new Date() : null });
    await createAuditLog(buildStatusAudit({ entityType: "incident", entityId: input.id, status: input.status, channel: "dashboard", userId: ctx.user?.id }));
    if (updated && input.status === "resolved") await sendSlackIncidentNotification({ title: updated.title, severity: updated.severity, summary: updated.aiExplanation ?? "Incident resolved from the dashboard.", incidentId: updated.id, action: "resolved" });
    return updated ? shapeIncident(updated) : null;
  }),
  audit: publicProcedure.input(z.object({ id: z.number().int().positive(), limit: z.number().min(1).max(100).optional() })).query(({ input }) => listAuditLogs("incident", input.id, input.limit ?? 50)),
});
