import { z } from 'zod';
import { hashPassword } from './auth-service.js';

const adminInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(12).max(128),
});

export async function upsertAdmin({ name, email, password, UserModel }) {
  const input = adminInputSchema.parse({ name, email, password });
  const passwordHash = await hashPassword(input.password);
  return UserModel.findOneAndUpdate(
    { email: input.email.toLowerCase() },
    { $set: { name: input.name, passwordHash, role: 'admin', subscription: 'premium' }, $setOnInsert: { photoURL: '' } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
}
