import { describe, expect, it } from "vitest";
import type { Alert } from "../../drizzle/schema";
import { clusterAlerts, clusterTitle, incidentSeverity } from "./clusteringService";

const alert = (id: number, message: string, severity: Alert["severity"], source = "api-gateway"): Alert => ({
  id, source, severity, message, metadata: {}, timestamp: new Date(`2026-08-18T10:0${id}:00.000Z`), status: "active", incidentId: null, createdAt: new Date(), updatedAt: new Date(), acknowledgedAt: null, resolvedAt: null,
});

describe("clusteringService", () => {
  it("groups closely related alert messages and keeps unrelated signals separate", () => {
    const groups = clusterAlerts([alert(1, "checkout latency above threshold", "warning"), alert(2, "checkout latency above threshold for region us-east", "error"), alert(3, "database connection refused", "critical")]);
    expect(groups).toHaveLength(2);
    expect(groups.find(group => group.alerts.some(item => item.id === 1))?.alerts).toHaveLength(2);
  });
  it("derives a readable cluster title and highest severity", () => {
    expect(clusterTitle({ source: "payment_gateway", message: "timeout rate rising" })).toContain("Payment Gateway");
    expect(incidentSeverity([alert(1, "a", "warning"), alert(2, "b", "critical")])).toBe("critical");
  });
});
