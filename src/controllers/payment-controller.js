import { env } from '../config/env.js';
import { stripe } from '../config/stripe.js';
import Payment from '../models/Payment.js';
import { fulfillCheckoutSession } from '../services/payment-service.js';
import { AppError } from '../utils/AppError.js';

// Creates Stripe Checkout session for premium access
export async function createCheckout(request, response) {
  const returnPath =
    typeof request.body.returnPath === 'string' &&
    request.body.returnPath.startsWith('/')
      ? request.body.returnPath
      : '/dashboard/profile';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',

    customer_email: request.user.email,

    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 500,
          product_data: {
            name: 'PromptGrid Premium Access',
            description: 'One-time unlock for every private prompt',
          },
        },
      },
    ],

    metadata: {
      userId: String(request.user._id),
    },

    success_url: `${env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&return=${encodeURIComponent(returnPath)}`,

    cancel_url: `${env.CLIENT_URL}/payment?canceled=1&return=${encodeURIComponent(returnPath)}`,
  });

  response.status(201).json({
    url: session.url,
  });
}

// Handles Stripe webhook events
export async function webhook(request, response) {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      request.body,
      request.headers['stripe-signature'],
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    throw new AppError(400, 'Invalid Stripe webhook signature');
  }

  // Fulfill payment when checkout is completed successfully
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    await fulfillCheckoutSession(event.data.object);
  }

  response.json({
    received: true,
  });
}

// Checks Stripe checkout session status after payment redirect
export async function sessionStatus(request, response) {
  const session = await stripe.checkout.sessions.retrieve(
    request.params.sessionId
  );

  // Prevent user from checking another user's payment session
  if (session.metadata?.userId !== String(request.user._id)) {
    throw new AppError(
      403,
      'This payment session belongs to another user'
    );
  }

  // If paid, activate premium and save payment record
  if (session.payment_status === 'paid') {
    await fulfillCheckoutSession(session);
  }

  response.json({
    paymentStatus: session.payment_status,
    premium: session.payment_status === 'paid',
    payment: await Payment.findOne({
      stripeSessionId: session.id,
    }),
  });
}