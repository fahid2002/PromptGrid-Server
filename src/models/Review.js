import mongoose from 'mongoose';

// Review schema stores user ratings and comments for prompts
const schema = new mongoose.Schema(
  {
    prompt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prompt',
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },
  },
  {
    timestamps: true,
  }
);

// Prevents the same user from reviewing the same prompt multiple times
schema.index(
  {
    user: 1,
    prompt: 1,
  },
  {
    unique: true,
  }
);

// Reuse existing model if already compiled, otherwise create new Review model
export default mongoose.models.Review || mongoose.model('Review', schema);