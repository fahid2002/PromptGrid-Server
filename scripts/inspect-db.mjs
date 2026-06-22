import 'dotenv/config';
import mongoose from 'mongoose';
import { writeFileSync } from 'node:fs';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'promptgrid';

if (!uri) {
  console.error('MONGODB_URI is missing. Put it in .env, then run this again.');
  process.exit(1);
}

const sensitiveWords = [
  'password', 'passwordHash', 'token', 'secret', 'jwt',
  'apiKey', 'stripe', 'refresh', 'access',
];

function mask(value) {
  if (Array.isArray(value)) return value.map(mask);
  if (value && typeof value === 'object') {
    const clean = {};
    for (const [key, child] of Object.entries(value)) {
      const lower = key.toLowerCase();
      clean[key] = sensitiveWords.some((word) => lower.includes(word.toLowerCase()))
        ? 'HIDDEN'
        : mask(child);
    }
    return clean;
  }
  return value;
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  return typeof value;
}

await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });

try {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const report = { databaseName: db.databaseName, collections: [] };

  for (const item of collections) {
    const collection = db.collection(item.name);
    const sampleDocuments = await collection.find({}).limit(3).toArray();
    const fieldTypes = {};

    for (const document of sampleDocuments) {
      for (const [key, value] of Object.entries(document)) {
        fieldTypes[key] ||= new Set();
        fieldTypes[key].add(typeOf(value));
      }
    }

    report.collections.push({
      name: item.name,
      documentCount: await collection.estimatedDocumentCount(),
      indexes: await collection.indexes(),
      fieldTypes: Object.fromEntries(
        Object.entries(fieldTypes).map(([key, values]) => [key, [...values]])
      ),
      sampleDocuments: mask(sampleDocuments),
    });
  }

  writeFileSync('db-report.json', JSON.stringify(report, null, 2));
  console.log('Created db-report.json');
} finally {
  await mongoose.disconnect();
}
