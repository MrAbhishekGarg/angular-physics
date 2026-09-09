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

/**
 * Saves the raw PDF (audit trail + "open the original" in the review UI),
 * runs the position-aware grid parser, and inserts one JobClass per
 * extracted cell, all flagged needsReview since the parser is a best-effort
 * heuristic against a complex, human-formatted document (see
 * scheduleGridParser.js's own doc comment). Rejects outright if this date
 * was already ingested — protects against a duplicate Zapier fire or an
 * accidental re-upload silently overwriting notes already typed onto that
 * day's classes.
 */
export async function ingestSchedulePdf(buffer, originalFilename) {
  const { date, dayOfWeek, classes, warnings } = await extractMyClassesFromPdf(buffer, env.mentorFacultyCode);

  if (!date) {
    throw new ApiError(400, `Could not find a schedule date in this PDF. ${warnings.join(' ')}`.trim());
  }

  const day = startOfDay(date);
  const existing = await JobScheduleUpload.findOne({ date: day }).lean();
  if (existing) {
    throw new ApiError(409, `A schedule for ${day.toISOString().slice(0, 10)} was already ingested — delete its classes first if you want to re-ingest.`);
  }

  const filename = `${day.toISOString().slice(0, 10)}-${Date.now()}.pdf`;
  const storedPath = path.join(JOB_SCHEDULE_UPLOADS_DIR, filename);
  fs.writeFileSync(storedPath, buffer);

  const upload = await JobScheduleUpload.create({
    date: day,
    originalFilename: originalFilename || '',
    storedPath: filename, // relative — JOB_SCHEDULE_UPLOADS_DIR may differ across environments
    extractedCount: classes.length,
    warnings,
  });

  const created = await JobClass.insertMany(
    classes.map((c) => ({
      date: day,
      dayOfWeek: dayOfWeek || '',
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

export async function deleteClass(id) {
  const deleted = await JobClass.findByIdAndDelete(id).lean();
  if (!deleted) throw new ApiError(404, 'Class not found');
  return deleted;
}

/**
 * Per-batch teaching log — the "progress" view. No separate Batch model:
 * this is a live aggregation over JobClass.batchCode, cheap enough at the
 * scale one mentor's own schedule ever reaches.
 */
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
