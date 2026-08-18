type AuditEntityType = "alert" | "incident";

export function buildStatusAudit(input: {
  entityType: AuditEntityType;
  entityId: number;
  status: string;
  channel: "dashboard" | "rest";
  userId?: number | null;
}) {
  return {
    entityType: input.entityType,
    entityId: input.entityId,
    action: `${input.entityType}_${input.status}`,
    userId: input.userId ?? null,
    details: { status: input.status, channel: input.channel },
  } as const;
}
