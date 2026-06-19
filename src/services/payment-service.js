import Payment from '../models/Payment.js';
import User from '../models/User.js';

export async function fulfillCheckoutSession(session, dependencies = { payments: Payment, users: User }) {
  if (session.payment_status !== 'paid') throw new Error('Checkout session is not paid');
  const userId = session.metadata?.userId;
  if (!userId) throw new Error('Checkout session has no user metadata');

  await dependencies.payments.updateOne(
    { stripeSessionId: session.id },
    { $setOnInsert: {
      user: userId,
      email: session.customer_details?.email,
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
      amount: session.amount_total,
      currency: session.currency,
      status: 'paid',
      paidAt: new Date(),
    } },
    { upsert: true },
  );
  await dependencies.users.findByIdAndUpdate(userId, { subscription: 'premium', premiumSince: new Date() });
}
