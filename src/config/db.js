import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase() {
  // Connect application to MongoDB using environment variables
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB,
    serverSelectionTimeoutMS: 10000,
  });
}