import mongoose from 'mongoose';
const schema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
        prompt: { type: mongoose.Schema.Types.ObjectId, ref: 'Prompt', required: true } }, { timestamps: true });
schema.index({ user: 1, prompt: 1 }, { unique: true });
export default mongoose.models.Bookmark || mongoose.model('Bookmark', schema);
