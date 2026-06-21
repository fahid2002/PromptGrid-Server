import mongoose from 'mongoose';

// Session schema stores refresh token sessions
const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    familyId: {
      type: String,
      required: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: {
        expires: 0,
      },
    },

    revokedAt: Date,

    replacedByTokenHash: String,
  },
  {
    timestamps: true,
  }
);

// Reuse existing model if already compiled, otherwise create new Session model
export default mongoose.models.Session || mongoose.model('Session', sessionSchema);