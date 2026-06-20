import { z } from 'zod';

export const publicRoleSchema = z.enum(['user', 'creator']);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: publicRoleSchema.default('user'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['user', 'creator', 'admin']).default('user'),
});

export const googleSchema = z.object({
  credential: z.string().min(1),
  intent: z.enum(['register', 'login']),
  role: publicRoleSchema.default('user'),
});
