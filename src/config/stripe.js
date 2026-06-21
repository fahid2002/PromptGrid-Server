import Stripe from 'stripe';
import { env } from './env.js';

// Create Stripe instance using secret key from environment variables
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
});