import mongoose from 'mongoose';

// Report schema stores user reports against prompts
const schema = new mongoose.Schema(
  {
    prompt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prompt',
      required: true,
      index: true,
    },

    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    reason: {
      type: String,
      enum: [
        'Inappropriate Content',
        'Spam',
        'Copyright Violation',
      ],
      required: true,
    },

    description: {
      type: String,
      default: '',
      maxlength: 1200,
    },

    status: {
      type: String,
      enum: [
        'pending',
        'removed',
        'warned',
        'dismissed',
      ],
      default: 'pending',
      index: true,
    },

    // Keeps original prompt information even if the prompt is removed later
    promptSnapshot: {
      title: {
        type: String,
        default: '',
      },
      description: {
        type: String,
        default: '',
      },
      category: {
        type: String,
        default: '',
      },
      aiTool: {
        type: String,
        default: '',
      },
      difficulty: {
        type: String,
        default: '',
      },
      visibility: {
        type: String,
        default: '',
      },
      creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Reuse existing model if already compiled, otherwise create new Report model
export default mongoose.models.Report || mongoose.model('Report', schema);