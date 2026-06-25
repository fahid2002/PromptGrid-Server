import mongoose from 'mongoose';

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

// Personal activity log for each user.
// Admin moderation history does not read from this collection.
const userActivitySchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },

    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    targetType: {
      type: String,
      required: true,
      trim: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    relatedPrompt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prompt',
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

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

userActivitySchema.index({
  actor: 1,
  createdAt: -1,
});

export default mongoose.models.UserActivity ||
  mongoose.model('UserActivity', userActivitySchema);