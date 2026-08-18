import {
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const incidents = mysqlTable("incidents", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["open", "acknowledged", "resolved", "suppressed"]).default("open").notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "error", "critical"]).notNull(),
  rootCause: text("rootCause"),
  aiExplanation: text("aiExplanation"),
  suggestedFixes: json("suggestedFixes").$type<string[]>(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  source: varchar("source", { length: 255 }).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "error", "critical"]).notNull(),
  message: text("message").notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  timestamp: timestamp("timestamp").notNull(),
  status: mysqlEnum("status", ["active", "acknowledged", "resolved", "suppressed"]).default("active").notNull(),
  incidentId: int("incidentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const clusters = mysqlTable("clusters", {
  id: int("id").autoincrement().primaryKey(),
  incidentId: int("incidentId"),
  centroid: text("centroid"),
  similarity: int("similarity").default(0),
  alertCount: int("alertCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const clusterMemberships = mysqlTable("clusterMemberships", {
  id: int("id").autoincrement().primaryKey(),
  clusterId: int("clusterId").notNull(),
  alertId: int("alertId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  entityType: mysqlEnum("entityType", ["alert", "incident"]).notNull(),
  entityId: int("entityId").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  userId: int("userId"),
  details: json("details").$type<Record<string, unknown>>(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const config = mysqlTable("config", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;
export type Cluster = typeof clusters.$inferSelect;
export type InsertCluster = typeof clusters.$inferInsert;
export type ClusterMembership = typeof clusterMemberships.$inferSelect;
export type InsertClusterMembership = typeof clusterMemberships.$inferInsert;
export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = typeof incidents.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type Config = typeof config.$inferSelect;
export type InsertConfig = typeof config.$inferInsert;

export type AlertSeverity = "info" | "warning" | "error" | "critical";
export type AlertStatus = "active" | "acknowledged" | "resolved" | "suppressed";
export type IncidentStatus = "open" | "acknowledged" | "resolved" | "suppressed";
export type TimelineEvent = { at: string; label: string; detail: string };
