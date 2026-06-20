import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipientRole: { type: String, enum: ['user', 'creator', 'admin'], required: true },
  type: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  message: { type: String, required: true, trim: true, maxlength: 1200 },
  href: { type: String, default: '' },
  eventKey: { type: String, required: true, unique: true, index: true },
  relatedPrompt: { type: mongoose.Schema.Types.ObjectId, ref: 'Prompt' },
  relatedReport: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  readAt: Date,
  expiresAt: { type: Date, default: () => new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)), index: { expires: 0 } },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
