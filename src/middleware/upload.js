import multer from 'multer';
export const uploadImage = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_request, file, done) => done(null, file.mimetype.startsWith('image/')) });
