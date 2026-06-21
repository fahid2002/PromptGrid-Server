import {
  openImageStream,
  readImageMetadata,
} from '../services/gridfs-image.js';

export async function showImage(request, response) {
  // Read image metadata from GridFS using image id
  const { contentType } = await readImageMetadata(request.params.id);

  // Set image response headers
  response.set({
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
  });

  // Open image stream and send it to the response
  openImageStream(request.params.id)
    .on('error', () => response.destroy())
    .pipe(response);
}