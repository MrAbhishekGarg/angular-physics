import fs from 'fs';
import path from 'path';
import JobClass from '../models/JobClass.js';
import JobScheduleUpload from '../models/JobScheduleUpload.js';
import { extractMyClassesFromPdf } from '../utils/scheduleGridParser.js';
import { JOB_SCHEDULE_UPLOADS_DIR } from '../middleware/upload.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

function startOfDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

const EXT_BY_MIME = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

/**
 * Ingests the day's schedule file.
 *
 * A PDF is parsed by the position-aware grid parser (scheduleGridParser.js)
 * — one JobClass per extracted cell, all flagged needsReview since that
 * parser is a best-effort heuristic against a complex human-formatted
 * document — with the date read from the PDF's own title.
 *
 * An image has no text layer to parse, so it's stored as an on-screen
 * reference only: no classes are created, and the caller must pass the
 * date explicitly (the mentor picks it in the UI) since it can't be read
 * off the pixels.
 *
 * Either way the raw file is archived, and a date that already has an
 * upload is rejected — protects against a duplicate Zapier fire or an
 * accidental re-upload silently overwriting notes already typed onto that
 * day's classes.
 */
export async function ingestScheduleFile(file, { date: explicitDate } = {}) {
  const isImage = file.mimetype !== 'application/pdf';

  let day;
  let dayOfWeek = '';
  let classes = [];
  let warnings = [];

  if (isImage) {
    if (!explicitDate) throw new ApiError(400, "Pick the schedule's date — it can't be read from an image.");
    day = startOfDay(new Date(explicitDate));
    if (Number.isNaN(day.getTime())) throw new ApiError(400, 'That date is not valid.');
    warnings = ["Image upload — classes can't be auto-extracted from an image. Add this day's classes with the form below; the image stays on this page for reference."];
  } else {
    const parsed = await extractMyClassesFromPdf(file.buffer, env.mentorFacultyCode);
    if (!parsed.date) {
      throw new ApiError(400, `Could not find a schedule date in this PDF. ${parsed.warnings.join(' ')}`.trim());
    }
    day = startOfDay(parsed.date);
    dayOfWeek = parsed.dayOfWeek || '';
    classes = parsed.classes;
    warnings = parsed.warnings;
  }

  const existing = await JobScheduleUpload.findOne({ date: day }).lean();
  if (existing) {
    throw new ApiError(409, `A schedule for ${day.toISOString().slice(0, 10)} was already uploaded — delete it first if you want to re-upload.`);
  }

  const ext = EXT_BY_MIME[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.bin';
  const filename = `${day.toISOString().slice(0, 10)}-${Date.now()}${ext}`;
  fs.writeFileSync(path.join(JOB_SCHEDULE_UPLOADS_DIR, filename), file.buffer);

  const upload = await JobScheduleUpload.create({
    date: day,
    originalFilename: file.originalname || '',
    storedPath: filename, // relative — JOB_SCHEDULE_UPLOADS_DIR may differ across environments
    extractedCount: classes.length,
    warnings,
  });

  const created = await JobClass.insertMany(
    classes.map((c) => ({
      date: day,
      dayOfWeek,
      startTime: c.startTime,
      endTime: c.endTime,
      room: c.room,
      batchCode: c.batchCode,
      subjectPrefix: c.subjectPrefix,
      rawText: c.rawText,
      needsReview: true,
      source: 'pdf',
      sourceUploadId: upload._id,
    }))
  );

  return { upload, classes: created.map((c) => c.toObject()), warnings };
}

export async function listClasses({ from, to, batchCode, needsReview } = {}) {
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = startOfDay(new Date(from));
    if (to) filter.date.$lte = startOfDay(new Date(to));
  }
  if (batchCode) filter.batchCode = batchCode;
  if (needsReview !== undefined) filter.needsReview = needsReview;

  return JobClass.find(filter).sort({ date: 1, startTime: 1 }).lean();
}

export async function createClass(payload) {
  const day = startOfDay(new Date(payload.date));
  const created = await JobClass.create({
    date: day,
    dayOfWeek: payload.dayOfWeek || day.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
    startTime: payload.startTime,
    endTime: payload.endTime || '',
    room: payload.room || '',
    batchCode: payload.batchCode,
    subjectPrefix: payload.subjectPrefix || '',
    topicsCovered: payload.topicsCovered || '',
    notes: payload.notes || '',
    needsReview: false,
    source: 'manual',
  });
  return created.toObject();
}

/**
 * Any successful edit clears needsReview — the mentor having looked at (and
 * corrected, if needed) a row is exactly what that flag exists to prompt.
 */
export async function updateClass(id, payload) {
  const update = { ...payload, needsReview: false };
  delete update.date; // date/source aren't editable after the fact — delete + re-add instead
  delete update.source;
  delete update.sourceUploadId;

  const updated = await JobClass.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
  if (!updated) throw new ApiError(404, 'Class not found');
  return updated;
}

/**
 * Deleting the last class tied to a given upload also removes that upload
 * row (and its stored file) — otherwise the date stays permanently blocked
 * from re-upload by ingestScheduleFile's duplicate guard even after every
 * class from it is gone, which would silently contradict the "delete it
 * first if you want to re-upload" error that guard gives.
 */
export async function deleteClass(id) {
  const deleted = await JobClass.findByIdAndDelete(id).lean();
  if (!deleted) throw new ApiError(404, 'Class not found');

  if (deleted.sourceUploadId) {
    const remaining = await JobClass.countDocuments({ sourceUploadId: deleted.sourceUploadId });
    if (remaining === 0) {
      const upload = await JobScheduleUpload.findByIdAndDelete(deleted.sourceUploadId).lean();
      if (upload) {
        const filePath = path.join(JOB_SCHEDULE_UPLOADS_DIR, upload.storedPath);
        fs.rm(filePath, { force: true }, () => {}); // best-effort — a missing file here is never worth failing the delete over
      }
    }
  }

  return deleted;
}

/**
 * Per-batch teaching log — the "progress" view. No separate Batch model:
 * this is a live aggregation over JobClass.batchCode, cheap enough at the
 * scale one mentor's own schedule ever reaches.
 */
/**
 * Deletes a whole day's ingest — every class tied to it plus the upload row
 * and stored PDF. For undoing a bad upload outright (wrong file, garbled
 * extraction) rather than one class at a time.
 */
export async function deleteUpload(id) {
  const upload = await JobScheduleUpload.findByIdAndDelete(id).lean();
  if (!upload) throw new ApiError(404, 'Schedule upload not found');

  await JobClass.deleteMany({ sourceUploadId: id });

  const filePath = path.join(JOB_SCHEDULE_UPLOADS_DIR, upload.storedPath);
  fs.rm(filePath, { force: true }, () => {});

  return upload;
}

export async function getBatchSummaries() {
  const rows = await JobClass.aggregate([
    { $sort: { date: -1, startTime: -1 } },
    {
      $group: {
        _id: '$batchCode',
        classCount: { $sum: 1 },
        lastTaught: { $max: '$date' },
        classes: {
          $push: {
            _id: '$_id',
            date: '$date',
            startTime: '$startTime',
            endTime: '$endTime',
            room: '$room',
            topicsCovered: '$topicsCovered',
            notes: '$notes',
            needsReview: '$needsReview',
          },
        },
      },
    },
    { $sort: { lastTaught: -1 } },
  ]);

  return rows.map((r) => ({ batchCode: r._id, classCount: r.classCount, lastTaught: r.lastTaught, classes: r.classes }));
}
