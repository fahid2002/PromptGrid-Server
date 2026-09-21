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
  accessToken: z.string().min(1),
  intent: z.enum(['register', 'login']),
  role: publicRoleSchema.default('user'),
});

export const mfaCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/).optional(),
  recoveryCode: z.string().trim().min(6).max(32).optional(),
}).refine((input) => input.code || input.recoveryCode, {
  message: 'A verification code is required',
});

export const mfaLoginSchema = mfaCodeSchema.extend({
  challengeToken: z.string().min(1),
});

export const emailMfaLoginSchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().trim().regex(/^\d{6}$/),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
  method: z.enum(['authenticator', 'email']),
  code: z.string().trim().min(6).max(32),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetSchema = z.object({
  email: z.string().email(),
  code: z.string().trim().regex(/^\d{6}$/),
  newPassword: z.string().min(8).max(128),
});
