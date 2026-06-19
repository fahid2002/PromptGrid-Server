import mongoose from 'mongoose';

const promptSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 1200 },
  content: { type: String, required: true, maxlength: 20000 },
  category: { type: String, required: true, trim: true, index: true },
  aiTool: { type: String, required: true, trim: true, index: true },
  tags: [{ type: String, trim: true, lowercase: true }],
  difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Pro'], required: true, index: true },
  usageInstructions: { type: String, required: true, maxlength: 3000 },
  thumbnailURL: { type: String, required: true },
  visibility: { type: String, enum: ['public', 'private'], default: 'public', index: true },
  copyCount: { type: Number, default: 0, min: 0 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  featured: { type: Boolean, default: false, index: true },
  rejectionFeedback: { type: String, default: '' },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

promptSchema.index({ title: 'text', description: 'text', tags: 'text', aiTool: 'text' });
export default mongoose.models.Prompt || mongoose.model('Prompt', promptSchema);
