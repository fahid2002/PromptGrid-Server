import Notification from '../models/Notification.js';
import User from '../models/User.js';

export async function notify(payload) {
  const recipient = await User.findById(payload.recipient).select('role').lean();
  if (!recipient) return null;
  return Notification.findOneAndUpdate(
    { eventKey: payload.eventKey },
    { $setOnInsert: { ...payload, recipientRole: recipient.role } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
}

export async function notifyAdmins(payload) {
  const admins = await User.find({ role: 'admin' }).select('_id role').lean();
  return Promise.all(admins.map((admin) => notify({
    ...payload,
    recipient: admin._id,
    recipientRole: admin.role,
    eventKey: `${payload.eventKey}:${admin._id}`,
  })));
}
