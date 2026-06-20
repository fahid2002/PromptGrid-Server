import AuditLog from '../models/AuditLog.js';

export function recordAudit(payload) {
  return AuditLog.create(payload);
}
