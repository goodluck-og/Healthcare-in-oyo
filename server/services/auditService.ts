export interface ServerAuditRecord {
  id: string;
  timestamp: string;
  actorUid: string;
  action: string;
  endpoint: string;
  statusCode: number;
  summary: string;
}

const MAX_BUFFER = 500;
const auditBuffer: ServerAuditRecord[] = [];

export function recordServerAudit(entry: Omit<ServerAuditRecord, 'id' | 'timestamp'>): ServerAuditRecord {
  const item: ServerAuditRecord = {
    id: `srv-aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  auditBuffer.unshift(item);
  if (auditBuffer.length > MAX_BUFFER) {
    auditBuffer.length = MAX_BUFFER;
  }
  console.info(
    JSON.stringify({
      audit: true,
      id: item.id,
      timestamp: item.timestamp,
      actorUid: item.actorUid,
      action: item.action,
      endpoint: item.endpoint,
      statusCode: item.statusCode,
      summary: item.summary,
    })
  );
  return item;
}

export function getRecentServerAuditEvents(): ServerAuditRecord[] {
  return [...auditBuffer];
}
