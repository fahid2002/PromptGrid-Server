import { storeImage } from '../services/gridfs-image.js';

// Uploads image file and stores it using GridFS image service
export async function upload(request, response) {
  response
    .status(201)
    .json(await storeImage(request.file));
}