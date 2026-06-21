import mongoose from 'mongoose';

// Payment schema stores successful Stripe payment records
const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    stripeSessionId: {
      type: String,
      required: true,
      unique: true,
    },

    stripePaymentIntentId: String,

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ['paid'],
      required: true,
    },

    paidAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Reuse existing model if already compiled, otherwise create new Payment model
export default mongoose.models.Payment || mongoose.model('Payment', schema);