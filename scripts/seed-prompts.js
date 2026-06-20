import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import Prompt from '../src/models/Prompt.js';
import User from '../src/models/User.js';
import { upsertAdmin } from '../src/services/admin-bootstrap.js';
import { buildStarterPromptOperations } from '../src/services/starter-prompt-bootstrap.js';

if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be configured before running npm run seed:prompts');
}

try {
  await connectDatabase();
  const owner = await upsertAdmin({ name: env.ADMIN_NAME, email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, UserModel: User });
  const source = new URL('../src/data/starter-prompts.json', import.meta.url);
  const prompts = JSON.parse(await readFile(source, 'utf8'));
  const result = await Prompt.bulkWrite(buildStarterPromptOperations(prompts, owner._id));
  console.log(`Starter prompts are ready: ${prompts.length} total (${result.upsertedCount} inserted, ${result.modifiedCount} updated)`);
} finally {
  await mongoose.disconnect();
}
