import type { AlertSeverity, InsertAlert } from "../../drizzle/schema";
import { assignAlertToIncident, createAuditLog, createCluster, getIncidentAlerts, insertAlert, insertIncident, listAlerts, updateIncident } from "../db";
import { alertText, embedText, fingerprintAlert } from "./embeddingService";
import { clusterAlerts, clusterTitle, incidentSeverity } from "./clusteringService";
import { runMultiAgentRCA } from "./multiAgentRCA";
import { sendSlackIncidentNotification } from "./slackService";

const severityRank: Record<AlertSeverity, number> = { info: 0, warning: 1, error: 2, critical: 3 };

export type IngestInput = {
  source: string;
  severity: AlertSeverity;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
};

export async function ingestAlert(input: IngestInput, actorId?: number) {
  const timestamp = input.timestamp ?? new Date();
  const alertInput: InsertAlert = {
    source: input.source,
    severity: input.severity,
    message: input.message,
    metadata: input.metadata ?? {},
    timestamp,
    status: "active",
  };
  const created = await insertAlert(alertInput);
  const existing = (await listAlerts(250)).filter(alert => alert.id !== created.id && alert.status !== "suppressed");
  const grouped = clusterAlerts([...existing, created]).find(group => group.alerts.some(alert => alert.id === created.id));
  const correlated = grouped?.alerts ?? [created];
  const correlatedExisting = correlated.filter(alert => alert.id !== created.id);
  let incident;
  if (correlatedExisting[0]?.incidentId) {
    incident = await updateIncident(correlatedExisting[0].incidentId, {
      severity: severityRank[input.severity] > severityRank[correlatedExisting[0].severity] ? input.severity : correlatedExisting[0].severity,
    });
    await assignAlertToIncident(created.id, correlatedExisting[0].incidentId);
    const incidentAlerts = await getIncidentAlerts(correlatedExisting[0].incidentId);
    const rca = await runMultiAgentRCA(incidentAlerts);
    incident = await updateIncident(correlatedExisting[0].incidentId, {
      rootCause: rca.rootCause,
      aiExplanation: rca.explanation,
      suggestedFixes: rca.suggestedFixes,
    });
    if (incident && severityRank[input.severity] > severityRank[correlatedExisting[0].severity]) {
      await sendSlackIncidentNotification({ title: incident.title, severity: incident.severity, summary: rca.explanation, incidentId: incident.id, action: "escalated" });
    }
  } else {
    incident = await insertIncident({
      title: clusterTitle(created),
      description: `Auto-clustered from ${created.source}.`,
      status: "open",
      severity: incidentSeverity(correlated),
      startTime: correlated.reduce((earliest, alert) => alert.timestamp < earliest ? alert.timestamp : earliest, created.timestamp),
      endTime: null,
      rootCause: null,
      aiExplanation: null,
      suggestedFixes: null,
    });
    await assignAlertToIncident(created.id, incident.id);
    const cluster = await createCluster({ incidentId: incident.id, centroid: JSON.stringify(embedText(alertText(created))), similarity: grouped?.similarity ?? 100, alertCount: correlated.length });
    for (const alert of correlatedExisting) {
      await assignAlertToIncident(alert.id, incident.id);
      await createClusterMembership(cluster.id, alert.id);
    }
    await createClusterMembership(cluster.id, created.id);
    const incidentAlerts = await getIncidentAlerts(incident.id);
    const rca = await runMultiAgentRCA(incidentAlerts);
    incident = await updateIncident(incident.id, { rootCause: rca.rootCause, aiExplanation: rca.explanation, suggestedFixes: rca.suggestedFixes });
    if (incident) await sendSlackIncidentNotification({ title: incident.title, severity: incident.severity, summary: rca.explanation, incidentId: incident.id, action: "created" });
  }
  await createAuditLog({ entityType: "alert", entityId: created.id, action: "ingested", userId: actorId ?? null, details: { source: created.source, severity: created.severity } });
  return { alert: await import("../db").then(({ getAlertById }) => getAlertById(created.id)), incident };
}

async function createClusterMembership(clusterId: number, alertId: number) {
  const { addAlertToCluster } = await import("../db");
  return addAlertToCluster(clusterId, alertId);
}
