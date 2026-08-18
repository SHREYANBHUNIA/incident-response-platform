export type AnalyticsAlert = {
  severity: string;
  timestamp: Date;
};

export type AnalyticsIncident = {
  status: string;
  startTime: Date;
  endTime: Date | null;
};

export function calculateAnalyticsTotals(alerts: AnalyticsAlert[], incidents: AnalyticsIncident[]) {
  const resolved = incidents.filter(incident => incident.status === "resolved" && incident.endTime);
  const mttrMinutes = resolved.length
    ? Math.round(
        resolved.reduce(
          (sum, incident) => sum + ((incident.endTime?.getTime() ?? 0) - incident.startTime.getTime()) / 60000,
          0,
        ) / resolved.length,
      )
    : 0;

  return {
    alerts: alerts.length,
    incidents: incidents.length,
    activeIncidents: incidents.filter(incident => incident.status !== "resolved").length,
    resolvedIncidents: resolved.length,
    alertsPerIncident: incidents.length ? Math.round((alerts.length / incidents.length) * 10) / 10 : 0,
    mttrMinutes,
  };
}
