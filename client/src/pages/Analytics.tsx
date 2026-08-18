import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Activity, AlertCircle, BarChart3, CheckCircle2, Clock3, Layers3, Radio, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

const tones = {
  critical: "bg-red-400",
  error: "bg-orange-400",
  warning: "bg-amber-300",
  info: "bg-sky-400",
} as const;

export default function Analytics() {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("7d");
  const input = useMemo(() => ({ period }), [period]);
  const query = trpc.metrics.analytics.useQuery(input, { refetchInterval: 15000 });
  const data = query.data;
  const maxVolume = Math.max(1, ...(data?.alertVolume.map(item => item.count) ?? [1]));

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-2rem)] -m-4 bg-[#090d14] p-5 text-slate-100 md:p-7">
        <div className="mx-auto max-w-[1450px] space-y-6">
          <header className="flex flex-col gap-4 border-b border-white/8 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-300/80">
                <BarChart3 className="h-3.5 w-3.5" /> Signal intelligence
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Analytics</h1>
              <p className="mt-2 text-sm text-slate-400">Operational trends across alert volume, incident severity, and recovery performance.</p>
            </div>
            <div className="flex items-center gap-3">
              {query.isFetching && !query.isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-violet-300" aria-label="Refreshing analytics" /> : null}
              <div className="flex rounded-lg border border-white/10 bg-white/[.03] p-1" role="group" aria-label="Analytics period">
                {(["24h", "7d", "30d"] as const).map(item => (
                  <button key={item} onClick={() => setPeriod(item)} className={`rounded-md px-3 py-1.5 text-xs transition ${period === item ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {query.isError ? (
            <Card className="border-red-400/20 bg-red-400/[.05]">
              <CardContent className="flex items-start gap-3 p-5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                <div>
                  <p className="font-medium text-red-100">Analytics unavailable</p>
                  <p className="mt-1 text-sm text-red-200/70">{query.error.message || "The metrics service did not return a snapshot."}</p>
                  <button onClick={() => query.refetch()} className="mt-3 text-xs font-medium text-red-200 underline underline-offset-4 hover:text-white">Retry snapshot</button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  { label: "Alerts", value: data?.totals.alerts ?? "—", icon: Radio, note: `in ${period}` },
                  { label: "Incidents", value: data?.totals.incidents ?? "—", icon: Layers3, note: "correlated groups" },
                  { label: "Active", value: data?.totals.activeIncidents ?? "—", icon: Activity, note: "requires attention" },
                  { label: "Resolved", value: data?.totals.resolvedIncidents ?? "—", icon: CheckCircle2, note: `closed in ${period}` },
                  { label: "Alerts / incident", value: data ? data.totals.alertsPerIncident.toFixed(1) : "—", icon: BarChart3, note: "noise compression" },
                  { label: "MTTR", value: data?.totals.mttrMinutes ? `${data.totals.mttrMinutes} min` : "—", icon: Clock3, note: "mean recovery" },
                ].map(item => (
                  <Card key={item.label} className="border-white/8 bg-[#101722]">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-slate-500">{item.label}</p>
                          <p className="mt-2 text-3xl font-semibold text-white">{query.isLoading ? <Skeleton className="h-9 w-16 bg-white/10" /> : item.value}</p>
                          <p className="mt-2 text-xs text-slate-600">{item.note}</p>
                        </div>
                        <item.icon className="h-5 w-5 text-violet-300" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </section>

              <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
                <Card className="border-white/8 bg-[#101722]">
                  <CardHeader><CardTitle className="text-base text-white">Alert volume</CardTitle><p className="mt-1 text-xs text-slate-500">Hourly buckets for the selected period.</p></CardHeader>
                  <CardContent>
                    {query.isLoading ? <Skeleton className="h-52 w-full bg-white/5" /> : data?.alertVolume.length ? <div className="flex h-52 items-end gap-1 overflow-hidden">{data.alertVolume.map(item => <div key={item.at} className="group flex min-w-[8px] flex-1 flex-col items-center justify-end gap-2"><div className="w-full rounded-t bg-violet-400/75 transition group-hover:bg-violet-300" style={{ height: `${Math.max(4, (item.count / maxVolume) * 100)}%` }} title={`${item.count} alerts`} /></div>)}</div> : <Empty title="No volume data" detail="No alerts were received in this window." />}
                  </CardContent>
                </Card>
                <Card className="border-white/8 bg-[#101722]">
                  <CardHeader><CardTitle className="text-base text-white">Incidents by status</CardTitle></CardHeader>
                  <CardContent className="space-y-4">{data?.statusCounts.length ? data.statusCounts.map(item => <div key={item.status}><div className="mb-2 flex justify-between text-xs"><span className="capitalize text-slate-400">{item.status}</span><span className="font-mono text-slate-300">{item.count}</span></div><div className="h-2 rounded-full bg-white/6"><div className={`h-full rounded-full ${item.status === "resolved" ? "bg-emerald-400" : item.status === "suppressed" ? "bg-slate-400" : "bg-violet-400"}`} style={{ width: `${Math.min(100, Math.max(3, item.count * 10))}%` }} /></div></div>) : <Empty title="No incident data" detail="Correlated incidents will appear here." />}</CardContent>
                </Card>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <Card className="border-white/8 bg-[#101722]">
                  <CardHeader><CardTitle className="text-base text-white">Severity distribution</CardTitle></CardHeader>
                  <CardContent className="space-y-4">{data?.severityCounts.length ? data.severityCounts.map(item => <div key={item.severity} className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${tones[item.severity as keyof typeof tones]}`} /><span className="w-20 capitalize text-sm text-slate-400">{item.severity}</span><div className="h-2 flex-1 rounded-full bg-white/6"><div className={`h-full rounded-full ${tones[item.severity as keyof typeof tones]}`} style={{ width: `${Math.min(100, Math.max(3, item.count * 10))}%` }} /></div><span className="w-8 text-right font-mono text-xs text-slate-500">{item.count}</span></div>) : <Empty title="No severity data" detail="Signals will be classified as they arrive." />}</CardContent>
                </Card>
                <Card className="border-white/8 bg-[#101722]">
                  <CardHeader><CardTitle className="text-base text-white">Top alert sources</CardTitle></CardHeader>
                  <CardContent className="space-y-3">{data?.sourceCounts.length ? data.sourceCounts.slice(0, 6).map((item, index) => <div key={item.source} className="flex items-center gap-3"><span className="font-mono text-xs text-slate-600">0{index + 1}</span><span className="flex-1 text-sm text-slate-300">{item.source}</span><span className="rounded-full bg-cyan-300/10 px-2 py-1 font-mono text-xs text-cyan-300">{item.count}</span></div>) : <Empty title="No source data" detail="Source concentration will appear after ingestion." />}</CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="flex h-40 flex-col items-center justify-center text-center"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-500"><BarChart3 className="h-5 w-5" /></div><p className="text-sm text-slate-300">{title}</p><p className="mt-1 text-xs text-slate-600">{detail}</p></div>;
}
