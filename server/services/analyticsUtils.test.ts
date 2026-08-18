import { describe, expect, it } from "vitest";
import { calculateAnalyticsTotals } from "./analyticsUtils";

describe("calculateAnalyticsTotals", () => {
  it("calculates recovery metrics from alert and incident snapshots", () => {
    const now = new Date("2026-08-18T12:00:00.000Z");
    const alerts = [
      { severity: "critical", timestamp: now },
      { severity: "error", timestamp: now },
      { severity: "warning", timestamp: now },
      { severity: "info", timestamp: now },
    ];
    const incidents = [
      { status: "resolved", startTime: new Date("2026-08-18T11:00:00.000Z"), endTime: new Date("2026-08-18T11:30:00.000Z") },
      { status: "open", startTime: new Date("2026-08-18T11:45:00.000Z"), endTime: null },
    ];

    expect(calculateAnalyticsTotals(alerts, incidents)).toEqual({
      alerts: 4,
      incidents: 2,
      activeIncidents: 1,
      resolvedIncidents: 1,
      alertsPerIncident: 2,
      mttrMinutes: 30,
    });
  });

  it("returns zero-safe values for an empty window", () => {
    expect(calculateAnalyticsTotals([], [])).toEqual({
      alerts: 0,
      incidents: 0,
      activeIncidents: 0,
      resolvedIncidents: 0,
      alertsPerIncident: 0,
      mttrMinutes: 0,
    });
  });
});
