import { MongoMemoryServer } from 'mongodb-memory-server';

const mongo = await MongoMemoryServer.create();
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '5000';
process.env.MONGODB_URI = mongo.getUri();
process.env.JWT_SECRET = 'local-memory-only-secret-with-at-least-32-characters';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.STRIPE_SECRET_KEY = 'sk_test_local_memory';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_local_memory';

const [{ app }, mongoose] = await Promise.all([import('../src/app.js'), import('mongoose')]);
await mongoose.default.connect(process.env.MONGODB_URI);
const server = app.listen(Number(process.env.PORT), () => console.log(`PromptGrid memory API listening on ${process.env.PORT}`));
async function shutdown() { await new Promise((resolve) => server.close(resolve)); await mongoose.default.disconnect(); await mongo.stop(); process.exit(0); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
