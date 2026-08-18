import type { Alert } from "../../drizzle/schema";

const STOP_WORDS = new Set(["the", "and", "for", "with", "from", "this", "that", "into", "has", "was", "are", "our"]);

export function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_:/.-]+/g, " ")
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
}

export function alertText(alert: Pick<Alert, "source" | "severity" | "message" | "metadata">) {
  return [alert.source, alert.severity, alert.message, JSON.stringify(alert.metadata ?? {})].join(" ");
}

export function embedText(value: string, dimensions = 64) {
  const vector = Array.from({ length: dimensions }, () => 0);
  for (const token of tokenize(value)) {
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    const bucket = Math.abs(hash) % dimensions;
    vector[bucket] += 1;
  }
  const norm = Math.sqrt(vector.reduce((total, value) => total + value * value, 0));
  return norm === 0 ? vector : vector.map(value => value / norm);
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length !== right.length || left.length === 0) return 0;
  const dot = left.reduce((total, value, index) => total + value * right[index], 0);
  const leftNorm = Math.sqrt(left.reduce((total, value) => total + value * value, 0));
  const rightNorm = Math.sqrt(right.reduce((total, value) => total + value * value, 0));
  return leftNorm === 0 || rightNorm === 0 ? 0 : dot / (leftNorm * rightNorm);
}

export function similarityPercent(left: string, right: string) {
  return Math.round(cosineSimilarity(embedText(left), embedText(right)) * 100);
}

export function fingerprintAlert(source: string, severity: string, message: string, metadata: Record<string, unknown> = {}) {
  const normalized = `${source}:${severity}:${tokenize(message).slice(0, 12).join("-")}:${JSON.stringify(metadata)}`;
  return embedText(normalized, 32).map(value => Math.round(value * 1000)).join("");
}
