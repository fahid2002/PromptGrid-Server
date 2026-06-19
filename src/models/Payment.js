import mongoose from 'mongoose';
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, email: { type: String, required: true }, stripeSessionId: { type: String, required: true, unique: true }, stripePaymentIntentId: String, amount: { type: Number, required: true }, currency: { type: String, required: true }, status: { type: String, enum: ['paid'], required: true }, paidAt: { type: Date, required: true } }, { timestamps: true });
export default mongoose.models.Payment || mongoose.model('Payment', schema);
