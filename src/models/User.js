import mongoose from 'mongoose';

// User schema stores account, role, subscription and warning information
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    photoURL: {
      type: String,
      default: '',
    },

    passwordHash: {
      type: String,
      select: false,
    },

    googleSubject: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },

    role: {
      type: String,
      enum: [
        'user',
        'creator',
        'admin',
      ],
      default: 'user',
      index: true,
    },

    subscription: {
      type: String,
      enum: [
        'free',
        'premium',
      ],
      default: 'free',
    },

    premiumSince: Date,

    mfaEnabled: {
      type: Boolean,
      default: false,
    },

    mfaSecretEncrypted: {
      type: String,
      select: false,
    },

    mfaRecoveryCodeHashes: {
      type: [String],
      select: false,
      default: [],
    },

    emailOtpHash: {
      type: String,
      select: false,
    },

    emailOtpExpiresAt: {
      type: Date,
      select: false,
    },

    emailOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    emailOtpPurpose: {
      type: String,
      enum: ['mfa-login', 'password-change', 'password-reset'],
      select: false,
    },

    emailOtpLastSentAt: {
      type: Date,
      select: false,
    },

    warnings: [
      {
        reason: String,

        report: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Report',
        },

        issuedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,

    // Remove sensitive fields when user data is converted to JSON
    toJSON: {
      transform: (_doc, value) => {
        delete value.passwordHash;
        delete value.googleSubject;
        delete value.mfaSecretEncrypted;
        delete value.mfaRecoveryCodeHashes;
        delete value.emailOtpHash;
        delete value.emailOtpExpiresAt;
        delete value.emailOtpAttempts;
        delete value.emailOtpPurpose;
        delete value.emailOtpLastSentAt;

        return value;
      },
    },
  }
);

// Reuse existing model if already compiled, otherwise create new User model
export default mongoose.models.User || mongoose.model('User', userSchema);
