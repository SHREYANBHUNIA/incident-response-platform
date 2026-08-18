import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConfig } from "../db";
import { sendSlackIncidentNotification } from "./slackService";

vi.mock("../db", () => ({ getConfig: vi.fn() }));

describe("sendSlackIncidentNotification", () => {
  beforeEach(() => {
    vi.mocked(getConfig).mockResolvedValue({ value: "https://hooks.slack.test/services/demo" } as never);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("ok", { status: 200 })));
  });

  it.each([
    ["created", "Incident created"],
    ["escalated", "Incident escalated"],
  ] as const)("sends the %s event to Slack", async (action, heading) => {
    const result = await sendSlackIncidentNotification({
      title: "API latency",
      severity: "critical",
      summary: "Latency increased across the edge tier.",
      incidentId: 19,
      action,
    });

    expect(result).toMatchObject({ sent: true, status: 200 });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [, request] = vi.mocked(fetch).mock.calls[0] ?? [];
    const body = JSON.parse(String((request as RequestInit).body));
    expect(body.text).toContain("[CRITICAL] API latency");
    expect(body.blocks[0].text.text).toBe(heading);
  });

  it("does not attempt a request when Slack is not configured", async () => {
    vi.mocked(getConfig).mockResolvedValueOnce(null);
    const result = await sendSlackIncidentNotification({ title: "No webhook", severity: "info", summary: "Skipped", action: "created" });
    expect(result).toEqual({ sent: false, reason: "not_configured" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
