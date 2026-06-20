import { openImageStream, readImageMetadata } from '../services/gridfs-image.js';

export async function showImage(request, response) {
  const { contentType } = await readImageMetadata(request.params.id);
  response.set({ 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' });
  openImageStream(request.params.id).on('error', () => response.destroy()).pipe(response);
}
