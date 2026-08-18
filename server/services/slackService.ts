import { getConfig } from "../db";

export type SlackIncidentPayload = {
  title: string;
  severity: string;
  summary: string;
  incidentId?: number;
  action: "created" | "escalated" | "resolved";
};

export async function getSlackWebhookUrl() {
  const entry = await getConfig("slack_webhook_url");
  return entry?.value?.trim() || null;
}

export async function sendSlackIncidentNotification(payload: SlackIncidentPayload) {
  const webhookUrl = await getSlackWebhookUrl();
  if (!webhookUrl) return { sent: false, reason: "not_configured" as const };
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `[${payload.severity.toUpperCase()}] ${payload.title}`,
        blocks: [
          { type: "header", text: { type: "plain_text", text: `Incident ${payload.action}` } },
          { type: "section", text: { type: "mrkdwn", text: `*${payload.title}*\n${payload.summary}` } },
          { type: "context", elements: [{ type: "mrkdwn", text: `Severity: *${payload.severity}*${payload.incidentId ? ` · Incident #${payload.incidentId}` : ""}` }] },
        ],
      }),
    });
    return { sent: response.ok, status: response.status };
  } catch (error) {
    console.warn("[Slack] Notification failed:", error);
    return { sent: false, reason: "request_failed" as const };
  }
}
