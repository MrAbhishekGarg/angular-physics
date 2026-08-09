import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { ApiError } from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
const COURSE_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'courses');
const CONTENT_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'content');
const QUESTION_IMAGE_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'question-images');
const DOUBT_IMAGE_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'doubt-images');

// Notes and videos are never served statically — they live outside UPLOADS_ROOT
// (which app.js exposes wholesale via express.static) and are only reachable
// through the auth-gated download/stream routes.
export const SECURE_UPLOADS_ROOT = path.join(__dirname, '..', '..', 'secure-uploads');
const NOTE_UPLOADS_DIR = path.join(SECURE_UPLOADS_ROOT, 'notes');
const VIDEO_UPLOADS_DIR = path.join(SECURE_UPLOADS_ROOT, 'videos');
const WORKSHEET_UPLOADS_DIR = path.join(SECURE_UPLOADS_ROOT, 'worksheets');

fs.mkdirSync(COURSE_UPLOADS_DIR, { recursive: true });
fs.mkdirSync(CONTENT_UPLOADS_DIR, { recursive: true });
fs.mkdirSync(NOTE_UPLOADS_DIR, { recursive: true });
fs.mkdirSync(VIDEO_UPLOADS_DIR, { recursive: true });
fs.mkdirSync(WORKSHEET_UPLOADS_DIR, { recursive: true });
fs.mkdirSync(QUESTION_IMAGE_UPLOADS_DIR, { recursive: true });
fs.mkdirSync(DOUBT_IMAGE_UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const ALLOWED_NOTE_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const ALLOWED_VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

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

const contentImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CONTENT_UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const contentImageUploader = multer({
  storage: contentImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPG, PNG, or WEBP images are allowed'));
    }
    cb(null, true);
  },
});

// Shared by Article covers and Topper photos — both are public-facing
// marketing images with the same size/type constraints as course images.
export function uploadContentImage(req, res, next) {
  contentImageUploader.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ApiError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'Image must be 5MB or smaller'));
    next(new ApiError(400, err.message || 'Image upload failed'));
  });
}

const noteStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, NOTE_UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const noteUploader = multer({
  storage: noteStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_NOTE_MIME_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, 'Only PDF, DOC/DOCX, or PPT/PPTX files are allowed'));
    }
    cb(null, true);
  },
});

export function uploadNoteFile(req, res, next) {
  noteUploader.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ApiError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'File must be 25MB or smaller'));
    next(new ApiError(400, err.message || 'File upload failed'));
  });
}

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VIDEO_UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const videoUploader = multer({
  storage: videoStorage,
  limits: { fileSize: 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_VIDEO_MIME_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, 'Only MP4, WEBM, or MOV videos are allowed'));
    }
    cb(null, true);
  },
});

export function uploadVideoFile(req, res, next) {
  videoUploader.single('video')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ApiError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'Video must be 1GB or smaller'));
    next(new ApiError(400, err.message || 'Video upload failed'));
  });
}

const worksheetStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, WORKSHEET_UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const worksheetUploader = multer({
  storage: worksheetStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf';
    if (!isPdf) return cb(new ApiError(400, 'Only PDF files are allowed'));
    cb(null, true);
  },
});

export function uploadWorksheetFile(req, res, next) {
  worksheetUploader.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ApiError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'File must be 25MB or smaller'));
    next(new ApiError(400, err.message || 'File upload failed'));
  });
}

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Bulk-question docx is parsed once and discarded — memory storage, no disk
// footprint, unlike notes/videos which persist as files.
const questionsDocxUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Some browser/OS combinations send application/octet-stream for .docx
    // when the file association is missing, so fall back to the extension.
    const isDocx = file.mimetype === DOCX_MIME_TYPE || path.extname(file.originalname).toLowerCase() === '.docx';
    if (!isDocx) {
      return cb(new ApiError(400, 'Only .docx files are allowed'));
    }
    cb(null, true);
  },
});

export function uploadQuestionsDocx(req, res, next) {
  questionsDocxUploader.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ApiError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'File must be 5MB or smaller'));
    next(new ApiError(400, err.message || 'File upload failed'));
  });
}

const EXCEL_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
]);

// Concept-codes bulk upload is parsed once and discarded — memory storage,
// same reasoning as the questions docx uploader above.
const conceptCodesExcelUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isExcel = EXCEL_MIME_TYPES.has(file.mimetype) || ext === '.xlsx' || ext === '.xls';
    if (!isExcel) return cb(new ApiError(400, 'Only .xlsx or .xls files are allowed'));
    cb(null, true);
  },
});

export function uploadConceptCodesExcel(req, res, next) {
  conceptCodesExcelUploader.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ApiError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'File must be 5MB or smaller'));
    next(new ApiError(400, err.message || 'File upload failed'));
  });
}

// "Type in Word, tag in Excel" bulk upload — two files in one request
// (fields 'docx' and 'excel'), each validated against its own expected
// type. Memory storage for both, same reasoning as the single-file
// uploaders above: parsed once, never persisted to disk.
const questionsDocxAndExcelUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === 'docx') {
      const isDocx = file.mimetype === DOCX_MIME_TYPE || ext === '.docx';
      if (!isDocx) return cb(new ApiError(400, 'The question document must be a .docx file'));
    } else if (file.fieldname === 'excel') {
      const isExcel = EXCEL_MIME_TYPES.has(file.mimetype) || ext === '.xlsx' || ext === '.xls';
      if (!isExcel) return cb(new ApiError(400, 'The mapping sheet must be a .xlsx or .xls file'));
    } else {
      return cb(new ApiError(400, `Unexpected file field "${file.fieldname}"`));
    }
    cb(null, true);
  },
});

export function uploadQuestionsDocxAndExcel(req, res, next) {
  questionsDocxAndExcelUploader.fields([
    { name: 'docx', maxCount: 1 },
    { name: 'excel', maxCount: 1 },
  ])(req, res, (err) => {
    if (!err) {
      if (!req.files?.docx?.[0] || !req.files?.excel?.[0]) {
        return next(new ApiError(400, 'Both a .docx question document and a .xlsx/.xls mapping sheet are required'));
      }
      return next();
    }
    if (err instanceof ApiError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'Each file must be 5MB or smaller'));
    next(new ApiError(400, err.message || 'File upload failed'));
  });
}

// Manual per-question diagram/equation image attach — decoupled from any
// specific Test/question id since QuestionEditor edits local unsaved state;
// the returned URL is just stored on the question and persisted whenever
// the whole test is saved.
const questionImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, QUESTION_IMAGE_UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const questionImageUploader = multer({
  storage: questionImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPG, PNG, or WEBP images are allowed'));
    }
    cb(null, true);
  },
});

export function uploadQuestionImage(req, res, next) {
  questionImageUploader.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ApiError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'Image must be 5MB or smaller'));
    next(new ApiError(400, err.message || 'Image upload failed'));
  });
}

const doubtImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DOUBT_IMAGE_UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const doubtImageUploader = multer({
  storage: doubtImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPG, PNG, or WEBP images are allowed'));
    }
    cb(null, true);
  },
});

export function uploadDoubtImage(req, res, next) {
  doubtImageUploader.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ApiError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'Image must be 5MB or smaller'));
    next(new ApiError(400, err.message || 'Image upload failed'));
  });
}
