import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { notifyAdmins } from './notification-service.js';

const defaultDependencies = {
  payments: Payment,
  users: User,
  notifyAdmins,
};

function formatAmount(amount, currency) {
  if (!amount || !currency) return 'the premium payment';

  return `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`;
}

export async function fulfillCheckoutSession(
  session,
  dependencies = defaultDependencies
) {
  if (session.payment_status !== 'paid') {
    throw new Error('Checkout session is not paid');
  }

  const userId = session.metadata?.userId;

  if (!userId) {
    throw new Error('Checkout session has no user metadata');
  }

  const customerEmail =
    session.customer_details?.email ||
    session.customer_email ||
    'Unknown customer';

  await dependencies.payments.updateOne(
    {
      stripeSessionId: session.id,
    },
    {
      $setOnInsert: {
        user: userId,
        email: customerEmail,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id,
        amount: session.amount_total,
        currency: session.currency,
        status: 'paid',
        paidAt: new Date(),
      },
    },
    {
      upsert: true,
    }
  );

  await dependencies.users.findByIdAndUpdate(userId, {
    subscription: 'premium',
    premiumSince: new Date(),
  });

  // Notify all admins when a user buys premium access.
  // eventKey prevents duplicate notifications if Stripe webhook and success page both run.
  if (dependencies.notifyAdmins) {
    await dependencies.notifyAdmins({
      type: 'premium_subscription',
      title: 'New premium subscription',
      message: `${customerEmail} purchased PromptGrid Premium Access for ${formatAmount(
        session.amount_total,
        session.currency
      )}.`,
      href: '/dashboard?view=payments',
      eventKey: `premium_subscription:${session.id}`,
    });
  }
}