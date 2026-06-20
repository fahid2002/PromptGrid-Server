import { uploadImageBuffer } from '../services/image-upload.js';

export async function upload(request, response) {
  const url = await uploadImageBuffer(request.file);
  response.status(201).json({ url });
}
