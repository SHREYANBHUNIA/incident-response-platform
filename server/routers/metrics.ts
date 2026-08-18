import { z } from "zod";
import { analyticsSnapshot, listAlerts, listIncidents } from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { calculateAnalyticsTotals } from "../services/analyticsUtils";

const periodDays = (period: "24h" | "7d" | "30d") => period === "24h" ? 1 : period === "7d" ? 7 : 30;

export const metricsRouter = router({
  dashboard: publicProcedure.query(async () => {
    const [alerts, incidents] = await Promise.all([listAlerts(250), listIncidents(100)]);
    return { alerts, incidents };
  }),
  analytics: publicProcedure.input(z.object({ period: z.enum(["24h", "7d", "30d"]).optional() }).optional()).query(async ({ input }) => {
    const period = input?.period ?? "7d";
    const since = new Date(Date.now() - periodDays(period) * 24 * 60 * 60 * 1000);
    const snapshot = await analyticsSnapshot(since);
    const severityCounts = ["critical", "error", "warning", "info"].map(severity => ({ severity, count: snapshot.alerts.filter(alert => alert.severity === severity).length }));
    const statusCounts = ["open", "acknowledged", "resolved", "suppressed"].map(status => ({ status, count: snapshot.incidents.filter(incident => incident.status === status).length }));
    const hourlyMap = new Map<string, number>();
    for (const alert of snapshot.alerts) {
      const bucket = new Date(alert.timestamp);
      bucket.setMinutes(0, 0, 0);
      const key = bucket.toISOString();
      hourlyMap.set(key, (hourlyMap.get(key) ?? 0) + 1);
    }
    const alertVolume = Array.from(hourlyMap.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([at, count]) => ({ at, count }));
    const totals = calculateAnalyticsTotals(snapshot.alerts, snapshot.incidents);
    return {
      period,
      totals,
      severityCounts,
      statusCounts,
      alertVolume,
      sourceCounts: snapshot.sources.map(item => ({ source: item.source, count: Number(item.count) })),
    };
  }),
});
