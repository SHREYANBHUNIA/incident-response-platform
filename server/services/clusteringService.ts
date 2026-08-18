import type { Alert } from "../../drizzle/schema";
import { alertText, cosineSimilarity, embedText } from "./embeddingService";

export type AlertCluster = {
  alerts: Alert[];
  similarity: number;
  representative: Alert;
};

export function clusterAlerts(alertList: Alert[], threshold = 0.56): AlertCluster[] {
  const groups: Array<{ alerts: Alert[]; vector: number[] }> = [];
  for (const alert of alertList) {
    const vector = embedText(alertText(alert));
    const match = groups
      .map((group, index) => ({ group, index, score: cosineSimilarity(vector, group.vector) }))
      .sort((left, right) => right.score - left.score)[0];
    if (match && match.score >= threshold) {
      match.group.alerts.push(alert);
      match.group.vector = match.group.alerts
        .map(item => embedText(alertText(item)))
        .reduce((sum, item) => sum.map((value, index) => value + item[index]));
    } else {
      groups.push({ alerts: [alert], vector });
    }
  }
  return groups.map(group => {
    const representative = group.alerts[0];
    const scores = group.alerts.map(item => cosineSimilarity(embedText(alertText(item)), group.vector));
    return {
      alerts: group.alerts,
      representative,
      similarity: Math.round((scores.reduce((sum, value) => sum + value, 0) / Math.max(scores.length, 1)) * 100),
    };
  });
}

export function clusterTitle(alert: Pick<Alert, "source" | "message">) {
  const source = alert.source.replace(/[-_]/g, " ").replace(/\b\w/g, character => character.toUpperCase());
  const summary = alert.message.split(/[.!?]/)[0]?.trim() || "Unclassified signal";
  return `${source} · ${summary.slice(0, 72)}`;
}

export function incidentSeverity(alerts: Alert[]): Alert["severity"] {
  const order: Alert["severity"][] = ["info", "warning", "error", "critical"];
  return alerts.reduce<Alert["severity"]>((highest, alert) => order.indexOf(alert.severity) > order.indexOf(highest) ? alert.severity : highest, "info");
}
