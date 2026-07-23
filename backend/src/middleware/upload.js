import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { ApiError } from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
const COURSE_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'courses');

fs.mkdirSync(COURSE_UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, COURSE_UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploader = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPG, PNG, or WEBP images are allowed'));
    }
    cb(null, true);
  },
});

/**
 * multer's single() calls next(err) with a MulterError/plain Error on
 * failure — neither is `isOperational`, so the centralized error handler
 * would hide the real reason. Normalize both into an ApiError here.
 */
export function uploadCourseImage(req, res, next) {
  uploader.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ApiError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'Image must be 5MB or smaller'));
    next(new ApiError(400, err.message || 'Image upload failed'));
  });
}
