import mongoose from 'mongoose';
const schema = new mongoose.Schema({ prompt: { type: mongoose.Schema.Types.ObjectId, ref: 'Prompt', required: true, index: true }, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, rating: { type: Number, required: true, min: 1, max: 5 }, comment: { type: String, required: true, trim: true, maxlength: 1200 } }, { timestamps: true });
schema.index({ user: 1, prompt: 1 }, { unique: true });
export default mongoose.models.Review || mongoose.model('Review', schema);
