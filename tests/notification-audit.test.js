import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongo;
let User;
let Notification;
let AuditLog;
let notify;
let recordAudit;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  ({ default: User } = await import('../src/models/User.js'));
  ({ default: Notification } = await import('../src/models/Notification.js'));
  ({ default: AuditLog } = await import('../src/models/AuditLog.js'));
  ({ notify } = await import('../src/services/notification-service.js'));
  ({ recordAudit } = await import('../src/services/audit-service.js'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('persistent notifications and moderation history', () => {
  it('stores one notification per idempotent event key', async () => {
    const recipient = await User.create({ name: 'Creator', email: 'creator-notify@example.com', role: 'creator' });
    const payload = { recipient: recipient._id, recipientRole: 'creator', type: 'warning', title: 'Admin warning', message: 'Review your prompt.', eventKey: 'warning:report-1' };
    await notify(payload);
    await notify(payload);
    expect(await Notification.countDocuments({ recipient: recipient._id })).toBe(1);
  });

  it('stores immutable audit snapshots', async () => {
    const entry = await recordAudit({ action: 'prompt_removed', targetType: 'prompt', targetId: new mongoose.Types.ObjectId(), summary: 'Removed reported prompt', snapshot: { title: 'Unsafe prompt' } });
    expect(entry.snapshot.title).toBe('Unsafe prompt');
    expect(await AuditLog.countDocuments()).toBe(1);
  });
});
