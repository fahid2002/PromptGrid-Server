import mongoose from 'mongoose';
import { setServers } from 'node:dns/promises';
import { env } from './env.js';

// Node's Windows resolver can fail MongoDB Atlas SRV lookups locally even
// when the same connection works in Vercel/Render. Keep the workaround
// development-only so deployed environments continue using their resolver.
if (env.NODE_ENV === 'development') {
  setServers(['8.8.8.8']);
}

export async function connectDatabase() {
  // Connect application to MongoDB using environment variables
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB,
    serverSelectionTimeoutMS: 10000,
  });
}
