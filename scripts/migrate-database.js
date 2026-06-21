import 'dotenv/config';
import mongoose from 'mongoose';
import AuditLog from '../src/models/AuditLog.js';
import Bookmark from '../src/models/Bookmark.js';
import Notification from '../src/models/Notification.js';
import Payment from '../src/models/Payment.js';
import Prompt from '../src/models/Prompt.js';
import Report from '../src/models/Report.js';
import Review from '../src/models/Review.js';
import Session from '../src/models/Session.js';
import User from '../src/models/User.js';
import { buildInsertOnlyOperations } from '../src/services/database-migration.js';

const sourceName = process.env.MONGODB_SOURCE_DB || 'test';
const targetName = process.env.MONGODB_DB || 'promptgrid';
const collectionNames = ['users', 'prompts', 'reviews', 'reports', 'bookmarks', 'payments', 'sessions', 'notifications', 'auditlogs'];
const models = [User, Prompt, Review, Report, Bookmark, Payment, Session, Notification, AuditLog];

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
if (sourceName === targetName) throw new Error('Source and target databases must be different');

await mongoose.connect(process.env.MONGODB_URI, { dbName: targetName, serverSelectionTimeoutMS: 10000 });

try {
  const client = mongoose.connection.getClient();
  const source = client.db(sourceName);
  const target = client.db(targetName);
  const summary = {};

  for (const name of collectionNames) {
    const documents = await source.collection(name).find({}).toArray();
    if (!documents.length) {
      if (!(await target.listCollections({ name }, { nameOnly: true }).hasNext())) await target.createCollection(name);
      summary[name] = { source: 0, inserted: 0, retained: await target.collection(name).estimatedDocumentCount() };
      continue;
    }
    const result = await target.collection(name).bulkWrite(buildInsertOnlyOperations(documents), { ordered: false });
    summary[name] = { source: documents.length, inserted: result.upsertedCount, retained: await target.collection(name).estimatedDocumentCount() };
  }

  for (const model of models) await model.createIndexes();
  if (!(await target.listCollections({ name: 'images.files' }, { nameOnly: true }).hasNext())) await target.createCollection('images.files');
  if (!(await target.listCollections({ name: 'images.chunks' }, { nameOnly: true }).hasNext())) await target.createCollection('images.chunks');
  await target.collection('images.files').createIndex({ filename: 1, uploadDate: 1 });
  await target.collection('images.chunks').createIndex({ files_id: 1, n: 1 }, { unique: true });

  console.log(JSON.stringify({ source: sourceName, target: targetName, collections: summary }, null, 2));
} finally {
  await mongoose.disconnect();
}
