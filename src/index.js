import mongoose from 'mongoose';
import { app } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';

await connectDatabase();
const server = app.listen(env.PORT, () => console.log(`PromptGrid API listening on port ${env.PORT}`));
async function shutdown() { server.close(async () => { await mongoose.disconnect(); process.exit(0); }); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
