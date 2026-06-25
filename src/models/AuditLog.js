import mongoose from 'mongoose';

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    action: {
      type: String,
      required: true,
      index: true,
    },

    targetType: {
      type: String,
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    summary: {
      type: String,
      required: true,
      maxlength: 500,
    },

    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Activity history stays for 30 days, then MongoDB removes it automatically.
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + THIRTY_DAYS),
      index: {
        expires: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({
  createdAt: -1,
});

auditLogSchema.index({
  actor: 1,
  createdAt: -1,
});

export default mongoose.models.AuditLog ||
  mongoose.model('AuditLog', auditLogSchema);