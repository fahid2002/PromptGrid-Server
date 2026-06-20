import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import User from '../src/models/User.js';
import { upsertAdmin } from '../src/services/admin-bootstrap.js';

if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be configured before running npm run seed:admin');
}

try {
  await connectDatabase();
  const admin = await upsertAdmin({ name: env.ADMIN_NAME, email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, UserModel: User });
  console.log(`Administrator is ready: ${admin.email}`);
} finally {
  await mongoose.disconnect();
}
