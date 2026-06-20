import { storeImage } from '../services/gridfs-image.js';

export async function upload(request, response) {
  response.status(201).json(await storeImage(request.file));
}
