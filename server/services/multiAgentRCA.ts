import type { Alert, TimelineEvent } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

export type RCAResult = {
  rootCause: string;
  explanation: string;
  suggestedFixes: string[];
  timeline: TimelineEvent[];
  confidence: number;
};

function messageText(result: Awaited<ReturnType<typeof invokeLLM>>) {
  const content = result.choices[0]?.message.content;
  if (typeof content === "string") return content;
  return content?.map(part => part.type === "text" ? part.text : "").join(" ") ?? "";
}

function parseJson<T>(content: string, fallback: T): T {
  try {
    const fenced = content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(fenced) as T;
  } catch {
    return fallback;
  }
}

function buildTimeline(alerts: Alert[]): TimelineEvent[] {
  return alerts
    .slice()
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime())
    .map((alert, index) => ({
      at: alert.timestamp.toISOString(),
      label: index === 0 ? "Initial signal" : `${alert.source} reported a correlated symptom`,
      detail: alert.message,
    }));
}

export async function runMultiAgentRCA(alerts: Alert[]): Promise<RCAResult> {
  const timeline = buildTimeline(alerts);
  const alertContext = alerts.map(alert => ({
    source: alert.source,
    severity: alert.severity,
    message: alert.message,
    timestamp: alert.timestamp.toISOString(),
    metadata: alert.metadata,
  }));
  const fallback: RCAResult = {
    rootCause: alerts[0] ? `Probable ${alerts[0].source} degradation propagated across dependent services.` : "Insufficient evidence to establish a root cause.",
    explanation: `The incident groups ${alerts.length} correlated alert${alerts.length === 1 ? "" : "s"}. The strongest shared signal is the ${alerts[0]?.source ?? "unknown"} source, while the timeline indicates how symptoms spread through the system.`,
    suggestedFixes: ["Validate the upstream dependency and recent deploys.", "Compare error rate and saturation against the last healthy window.", "Roll back or disable the suspected change, then verify recovery with a canary."],
    timeline,
    confidence: alerts.length > 2 ? 82 : 66,
  };

  try {
    const hypothesis = await invokeLLM({
      messages: [
        { role: "system", content: "You are the hypothesis agent in an incident RCA workflow. Return concise JSON with rootCause, contributingSignals, and confidence." },
        { role: "user", content: JSON.stringify({ task: "Generate one ranked root-cause hypothesis from these alerts.", alerts: alertContext }) },
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 700,
    });
    const hypothesisJson = parseJson<{ rootCause?: string; contributingSignals?: string[]; confidence?: number }>(messageText(hypothesis), {});

    const evidence = await invokeLLM({
      messages: [
        { role: "system", content: "You are the evidence agent. Challenge the proposed hypothesis against the alert evidence and explain uncertainty. Return JSON with explanation and confidence." },
        { role: "user", content: JSON.stringify({ hypothesis: hypothesisJson, alerts: alertContext }) },
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 800,
    });
    const evidenceJson = parseJson<{ explanation?: string; confidence?: number }>(messageText(evidence), {});

    const remediation = await invokeLLM({
      messages: [
        { role: "system", content: "You are the remediation agent. Propose safe, actionable incident fixes. Return JSON with suggestedFixes as an array of strings." },
        { role: "user", content: JSON.stringify({ hypothesis: hypothesisJson, evidence: evidenceJson, alerts: alertContext }) },
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 800,
    });
    const remediationJson = parseJson<{ suggestedFixes?: string[] }>(messageText(remediation), {});

    return {
      rootCause: hypothesisJson.rootCause || fallback.rootCause,
      explanation: evidenceJson.explanation || fallback.explanation,
      suggestedFixes: remediationJson.suggestedFixes?.filter(Boolean).slice(0, 6) || fallback.suggestedFixes,
      timeline,
      confidence: Math.max(0, Math.min(100, evidenceJson.confidence ?? hypothesisJson.confidence ?? fallback.confidence)),
    };
  } catch (error) {
    console.warn("[RCA] Falling back to deterministic explanation:", error);
    return fallback;
  }
}
