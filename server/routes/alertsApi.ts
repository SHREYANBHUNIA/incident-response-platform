import type { Express, Request, Response } from "express";
import { z } from "zod";
import { createAuditLog, getIncidentById, updateAlertStatus, updateIncident } from "../db";
import { ingestAlert } from "../services/incidentService";
import { buildStatusAudit } from "../services/auditService";
import { sendSlackIncidentNotification } from "../services/slackService";

const AlertInputSchema = z.object({
  source: z.string().min(1).max(255),
  severity: z.enum(["info", "warning", "error", "critical"]),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.coerce.date().optional(),
});

export function registerAlertApi(app: Express) {
  app.get("/api/v1/health", (_req: Request, res: Response) => {
    res.json({ ok: true, service: "incident-response-platform", timestamp: new Date().toISOString() });
  });

  app.post("/api/v1/alerts", async (req: Request, res: Response) => {
    const body = Array.isArray(req.body) ? req.body : [req.body];
    const parsed = z.array(AlertInputSchema).safeParse(body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid alert payload", issues: parsed.error.issues });
      return;
    }
    try {
      const results = [];
      for (const input of parsed.data) results.push(await ingestAlert(input));
      res.status(201).json({ accepted: results.length, results });
    } catch (error) {
      console.error("[Alerts API] ingestion failed", error);
      res.status(500).json({ error: "Alert ingestion failed" });
    }
  });

  app.patch("/api/v1/alerts/:id/status", async (req: Request, res: Response) => {
    const parsedId = z.coerce.number().int().positive().safeParse(req.params.id);
    const parsedBody = z.object({ status: z.enum(["active", "acknowledged", "resolved", "suppressed"]) }).safeParse(req.body);
    if (!parsedId.success || !parsedBody.success) {
      res.status(400).json({ error: "Invalid alert status payload" });
      return;
    }
    try {
      const updated = await updateAlertStatus(parsedId.data, parsedBody.data.status);
      if (!updated) {
        res.status(404).json({ error: "Alert not found" });
        return;
      }
      await createAuditLog(buildStatusAudit({ entityType: "alert", entityId: parsedId.data, status: parsedBody.data.status, channel: "rest" }));
      res.json({ alert: updated });
    } catch (error) {
      console.error("[Alerts API] alert status update failed", error);
      res.status(500).json({ error: "Alert status update failed" });
    }
  });

  app.patch("/api/v1/incidents/:id/status", async (req: Request, res: Response) => {
    const parsedId = z.coerce.number().int().positive().safeParse(req.params.id);
    const parsedBody = z.object({ status: z.enum(["open", "acknowledged", "resolved", "suppressed"]) }).safeParse(req.body);
    if (!parsedId.success || !parsedBody.success) {
      res.status(400).json({ error: "Invalid incident status payload" });
      return;
    }
    try {
      const incident = await getIncidentById(parsedId.data);
      if (!incident) {
        res.status(404).json({ error: "Incident not found" });
        return;
      }
      const updated = await updateIncident(parsedId.data, { status: parsedBody.data.status, endTime: parsedBody.data.status === "resolved" ? new Date() : null });
      await createAuditLog(buildStatusAudit({ entityType: "incident", entityId: parsedId.data, status: parsedBody.data.status, channel: "rest" }));
      if (updated && parsedBody.data.status === "resolved") await sendSlackIncidentNotification({ title: updated.title, severity: updated.severity, summary: updated.aiExplanation ?? "Incident resolved through the REST API.", incidentId: updated.id, action: "resolved" });
      res.json({ incident: updated });
    } catch (error) {
      console.error("[Alerts API] incident status update failed", error);
      res.status(500).json({ error: "Incident status update failed" });
    }
  });
}
