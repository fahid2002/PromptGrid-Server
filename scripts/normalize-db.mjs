import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'promptgrid';

if (!uri) {
  console.error('MONGODB_URI missing');
  process.exit(1);
}

await mongoose.connect(uri, { dbName });

const db = mongoose.connection.db;

const privateResult = await db.collection('prompts').updateMany(
  { visibility: 'Private' },
  { $set: { visibility: 'private' } }
);

const publicResult = await db.collection('prompts').updateMany(
  { visibility: 'Public' },
  { $set: { visibility: 'public' } }
);

console.log({
  database: dbName,
  privateFixed: privateResult.modifiedCount,
  publicFixed: publicResult.modifiedCount,
});

await mongoose.disconnect();