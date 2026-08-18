import { and, desc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Alert,
  AlertStatus,
  AuditLog,
  Cluster,
  Config,
  Incident,
  IncidentStatus,
  InsertAlert,
  InsertIncident,
  alerts,
  auditLogs,
  clusterMemberships,
  clusters,
  config,
  incidents,
  users,
  InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = { lastSignedIn: user.lastSignedIn ?? new Date() };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0];
}

export async function listAlerts(limit = 100, status?: AlertStatus): Promise<Alert[]> {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(alerts).orderBy(desc(alerts.timestamp)).limit(limit);
  if (status) return db.select().from(alerts).where(eq(alerts.status, status)).orderBy(desc(alerts.timestamp)).limit(limit);
  return query;
}

export async function getAlertById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
  return rows[0];
}

export async function insertAlert(input: InsertAlert): Promise<Alert> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(alerts).values(input);
  const insertId = Number((result as { insertId?: number }).insertId);
  const created = await getAlertById(insertId);
  if (!created) throw new Error("Alert was inserted but could not be reloaded");
  return created;
}

export async function updateAlertStatus(id: number, status: AlertStatus) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(alerts).set({ status, updatedAt: new Date() }).where(eq(alerts.id, id));
  return getAlertById(id);
}

export async function listIncidents(limit = 50): Promise<Incident[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(incidents).orderBy(desc(incidents.createdAt)).limit(limit);
}

export async function getIncidentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  return rows[0];
}

export async function insertIncident(input: InsertIncident): Promise<Incident> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(incidents).values(input);
  const insertId = Number((result as { insertId?: number }).insertId);
  const created = await getIncidentById(insertId);
  if (!created) throw new Error("Incident was inserted but could not be reloaded");
  return created;
}

export async function updateIncident(id: number, patch: Partial<Pick<Incident, "rootCause" | "aiExplanation" | "suggestedFixes" | "status" | "endTime" | "severity" | "description">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(incidents).set({ ...patch, updatedAt: new Date() }).where(eq(incidents.id, id));
  return getIncidentById(id);
}

export async function listClusters(limit = 50): Promise<Cluster[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clusters).orderBy(desc(clusters.updatedAt)).limit(limit);
}

export async function createCluster(input: { incidentId?: number; centroid?: string; similarity?: number; alertCount?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(clusters).values({
    incidentId: input.incidentId,
    centroid: input.centroid,
    similarity: input.similarity ?? 0,
    alertCount: input.alertCount ?? 0,
  });
  const insertId = Number((result as { insertId?: number }).insertId);
  const rows = await db.select().from(clusters).where(eq(clusters.id, insertId)).limit(1);
  if (!rows[0]) throw new Error("Cluster was inserted but could not be reloaded");
  return rows[0];
}

export async function addAlertToCluster(clusterId: number, alertId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(clusterMemberships).values({ clusterId, alertId });
}

export async function getIncidentAlerts(incidentId: number): Promise<Alert[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alerts).where(eq(alerts.incidentId, incidentId)).orderBy(alerts.timestamp);
}

export async function assignAlertToIncident(alertId: number, incidentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(alerts).set({ incidentId, updatedAt: new Date() }).where(eq(alerts.id, alertId));
  return getAlertById(alertId);
}

export async function getClusterForIncident(incidentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(clusters).where(eq(clusters.incidentId, incidentId)).limit(1);
  return rows[0];
}

export async function createAuditLog(input: Omit<AuditLog, "id" | "timestamp">) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(input);
}

export async function listAuditLogs(entityType: "alert" | "incident", entityId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId))).orderBy(desc(auditLogs.timestamp)).limit(limit);
}

export async function getConfig(key: string): Promise<Config | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(config).where(eq(config.key, key)).limit(1);
  return rows[0];
}

export async function setConfig(key: string, value: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(config).values({ key, value }).onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
  return getConfig(key);
}

export async function analyticsSnapshot(since: Date) {
  const db = await getDb();
  if (!db) return { alerts: [], incidents: [], sources: [], hourly: [] };
  const recentAlerts = await db.select().from(alerts).where(gte(alerts.timestamp, since));
  const recentIncidents = await db.select().from(incidents).where(gte(incidents.startTime, since));
  const sourceCounts = await db.select({ source: alerts.source, count: sql<number>`count(*)` }).from(alerts).where(gte(alerts.timestamp, since)).groupBy(alerts.source).orderBy(desc(sql`count(*)`));
  return { alerts: recentAlerts, incidents: recentIncidents, sources: sourceCounts, hourly: [] };
}
