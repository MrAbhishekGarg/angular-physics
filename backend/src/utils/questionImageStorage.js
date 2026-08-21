import fs from 'fs';
import path from 'path';
import { UPLOADS_ROOT } from '../middleware/upload.js';

// Question diagrams/equation images carry no confidentiality requirement
// (unlike note files or correct answers) — served the same public,
// static way as course cover images, no auth-gating needed.
const QUESTION_IMAGES_DIR = path.join(UPLOADS_ROOT, 'question-images');
fs.mkdirSync(QUESTION_IMAGES_DIR, { recursive: true });

const EXT_BY_MIME = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/bmp': 'bmp' };

export function saveQuestionImage(buffer, mimeType) {
  const ext = EXT_BY_MIME[mimeType] || 'png';
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  fs.writeFileSync(path.join(QUESTION_IMAGES_DIR, filename), buffer);
  return `/uploads/question-images/${filename}`;
}

export { QUESTION_IMAGES_DIR };
