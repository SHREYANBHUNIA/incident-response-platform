import { describe, expect, it } from "vitest";
import { buildStatusAudit } from "./auditService";

describe("buildStatusAudit", () => {
  it("keeps dashboard status transitions attributable", () => {
    expect(buildStatusAudit({ entityType: "alert", entityId: 7, status: "acknowledged", channel: "dashboard", userId: 42 })).toEqual({
      entityType: "alert",
      entityId: 7,
      action: "alert_acknowledged",
      userId: 42,
      details: { status: "acknowledged", channel: "dashboard" },
    });
  });

  it("keeps REST incident transitions attributable even without a session user", () => {
    expect(buildStatusAudit({ entityType: "incident", entityId: 11, status: "suppressed", channel: "rest" })).toEqual({
      entityType: "incident",
      entityId: 11,
      action: "incident_suppressed",
      userId: null,
      details: { status: "suppressed", channel: "rest" },
    });
  });
});
