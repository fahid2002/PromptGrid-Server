import { describe, expect, it, vi } from 'vitest';
import { fulfillCheckoutSession } from '../src/services/payment-service.js';

describe('Stripe fulfillment', () => {
  it('ignores unpaid sessions', async () => {
    const dependencies = { payments: { updateOne: vi.fn() }, users: { findByIdAndUpdate: vi.fn() } };
    await expect(fulfillCheckoutSession({ id: 'cs_1', payment_status: 'unpaid', metadata: { userId: 'u1' } }, dependencies)).rejects.toThrow('not paid');
    expect(dependencies.payments.updateOne).not.toHaveBeenCalled();
  });

  it('upserts one transaction and upgrades its user', async () => {
    const dependencies = { payments: { updateOne: vi.fn() }, users: { findByIdAndUpdate: vi.fn() } };
    await fulfillCheckoutSession({
      id: 'cs_paid', payment_status: 'paid', payment_intent: 'pi_1', amount_total: 500,
      currency: 'usd', customer_details: { email: 'user@example.com' }, metadata: { userId: 'u1' },
    }, dependencies);
    expect(dependencies.payments.updateOne).toHaveBeenCalledWith(
      { stripeSessionId: 'cs_paid' }, expect.any(Object), { upsert: true },
    );
    expect(dependencies.users.findByIdAndUpdate).toHaveBeenCalledWith('u1', expect.objectContaining({ subscription: 'premium' }));
  });
});
