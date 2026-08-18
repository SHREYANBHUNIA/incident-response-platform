import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Alert } from "../../drizzle/schema";

vi.mock("../_core/llm", () => ({ invokeLLM: vi.fn().mockRejectedValue(new Error("LLM unavailable in unit test")) }));

import { runMultiAgentRCA } from "./multiAgentRCA";

const makeAlert = (id: number, timestamp: string): Alert => ({
  id, source: "checkout", severity: id === 2 ? "critical" : "warning", message: `signal ${id}`, metadata: {}, timestamp: new Date(timestamp), status: "active", incidentId: null, createdAt: new Date(), updatedAt: new Date(), acknowledgedAt: null, resolvedAt: null,
});

describe("multiAgentRCA", () => {
  beforeEach(() => vi.clearAllMocks());
  it("returns a safe explanation and chronologically ordered timeline when the LLM is unavailable", async () => {
    const result = await runMultiAgentRCA([makeAlert(2, "2026-08-18T10:02:00.000Z"), makeAlert(1, "2026-08-18T10:01:00.000Z")]);
    expect(result.rootCause).toContain("checkout");
    expect(result.timeline.map(item => item.at)).toEqual(["2026-08-18T10:01:00.000Z", "2026-08-18T10:02:00.000Z"]);
    expect(result.suggestedFixes.length).toBeGreaterThan(0);
    expect(result.confidence).toBe(66);
  });
});
