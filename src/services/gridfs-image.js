import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const imageBucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'images' });

export async function storeImage(file) {
  if (!file) throw new AppError(400, 'An image file is required.');
  if (!allowedTypes.has(file.mimetype)) throw new AppError(400, 'Choose a JPEG, PNG, or WebP image.');
  const upload = imageBucket().openUploadStream(file.originalname || 'image', { metadata: { contentType: file.mimetype } });
  upload.end(file.buffer);
  await new Promise((resolve, reject) => upload.once('finish', resolve).once('error', reject));
  return { id: String(upload.id), contentType: file.mimetype, url: `/api/images/${upload.id}` };
}

export async function readImageMetadata(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'Image not found.');
  const [file] = await imageBucket().find({ _id: new mongoose.Types.ObjectId(id) }).toArray();
  if (!file) throw new AppError(404, 'Image not found.');
  return { file, contentType: file.metadata?.contentType || 'application/octet-stream' };
}

export function openImageStream(id) {
  return imageBucket().openDownloadStream(new mongoose.Types.ObjectId(id));
}
