import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

describe('GridFS images', () => {
  it('stores and reads an image with metadata', async () => {
    const { storeImage, readImageMetadata } = await import('../src/services/gridfs-image.js');
    const saved = await storeImage({ buffer: Buffer.from('image'), mimetype: 'image/png', originalname: 'avatar.png' });
    expect(saved.url).toBe(`/api/images/${saved.id}`);
    expect(await readImageMetadata(saved.id)).toMatchObject({ contentType: 'image/png' });
  });

  it('rejects unsupported image types', async () => {
    const { storeImage } = await import('../src/services/gridfs-image.js');
    await expect(storeImage({ buffer: Buffer.from('x'), mimetype: 'text/plain', originalname: 'x.txt' })).rejects.toMatchObject({ status: 400 });
  });
});
