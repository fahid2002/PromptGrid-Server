import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().trim().min(1).default('promptgrid'),
  GEMINI_API_KEY: z.string().trim().min(1).optional(),
  GEMINI_MODEL: z.string().trim().min(1).default('gemini-3.1-flash-lite').transform((model) => (
    ['gemini-2.5-flash', 'gemini-3.6-flash'].includes(model) ? 'gemini-3.1-flash-lite' : model
  )),
  MFA_ENCRYPTION_KEY: z.string().trim().regex(/^[a-f0-9]{64}$/i).optional(),
  JWT_SECRET: z.string().min(32),
  CLIENT_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  ADMIN_NAME: z.string().trim().min(2).max(80).default('PromptGrid Admin'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).max(128).optional(),
});

export const env = schema.parse(process.env);
