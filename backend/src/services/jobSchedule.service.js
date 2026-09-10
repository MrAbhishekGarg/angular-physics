import fs from 'fs';
import path from 'path';
import JobClass from '../models/JobClass.js';
import JobScheduleUpload from '../models/JobScheduleUpload.js';
import JobTopicPlan from '../models/JobTopicPlan.js';
import { extractMyClassesFromPdf } from '../utils/scheduleGridParser.js';
import { durationMinutes } from '../utils/jobTime.js';
import { JOB_SCHEDULE_UPLOADS_DIR } from '../middleware/upload.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

function startOfDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isoWeekStart(date) {
  const d = new Date(date);
  const dow = (d.getUTCDay() + 6) % 7; // Mon = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return startOfDay(d);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
    subjectPrefix: payload.subjectPrefix || 'Physics',
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
  const [classes, plans] = await Promise.all([
    JobClass.find().sort({ date: -1, startTime: -1 }).lean(),
    JobTopicPlan.find().sort({ order: 1, createdAt: 1 }).lean(),
  ]);

  const plansByBatch = new Map();
  plans.forEach((p) => {
    if (!plansByBatch.has(p.batchCode)) plansByBatch.set(p.batchCode, []);
    plansByBatch.get(p.batchCode).push(p);
  });

  const byBatch = new Map();
  classes.forEach((c) => {
    if (!byBatch.has(c.batchCode)) byBatch.set(c.batchCode, []);
    byBatch.get(c.batchCode).push(c);
  });

  const codes = new Set([...byBatch.keys(), ...plansByBatch.keys()]);

  return [...codes]
    .map((code) => {
      const cs = byBatch.get(code) || [];
      const plan = plansByBatch.get(code) || [];
      const minutes = cs.reduce((sum, c) => sum + durationMinutes(c.startTime, c.endTime), 0);
      return {
        batchCode: code,
        classCount: cs.length,
        hours: Math.round((minutes / 60) * 10) / 10,
        lastTaught: cs.length ? cs.reduce((max, c) => (c.date > max ? c.date : max), cs[0].date) : null,
        topicsLogged: cs.filter((c) => c.topicsCovered?.trim()).length,
        plan,
        planned: plan.length,
        planCovered: plan.filter((p) => p.done).length,
        classes: cs.map((c) => ({
          _id: c._id,
          date: c.date,
          startTime: c.startTime,
          endTime: c.endTime,
          room: c.room,
          topicsCovered: c.topicsCovered,
          notes: c.notes,
          needsReview: c.needsReview,
        })),
      };
    })
    .sort((a, b) => {
      if (!a.lastTaught) return 1;
      if (!b.lastTaught) return -1;
      return new Date(b.lastTaught) - new Date(a.lastTaught);
    });
}

/**
 * One aggregate call powering the "My Job" overview dashboard — every
 * headline number the mentor asked for, derived from the class log plus the
 * topic-plan checklist. "Done" is date-only (a class before today); today's
 * classes count as upcoming so the number never silently drops mid-day.
 */
export async function getDashboard() {
  const today = startOfDay(new Date());
  const [classes, plans, uploadCount] = await Promise.all([
    JobClass.find().sort({ date: 1, startTime: 1 }).lean(),
    JobTopicPlan.find().lean(),
    JobScheduleUpload.countDocuments(),
  ]);

  const done = classes.filter((c) => new Date(c.date) < today);
  const upcoming = classes.filter((c) => new Date(c.date) >= today);
  const doneMinutes = done.reduce((s, c) => s + durationMinutes(c.startTime, c.endTime), 0);
  const upcomingMinutes = upcoming.reduce((s, c) => s + durationMinutes(c.startTime, c.endTime), 0);

  const weekStart = isoWeekStart(new Date());
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thisWeek = classes.filter((c) => new Date(c.date) >= weekStart && new Date(c.date) < weekEnd);
  const thisWeekMinutes = thisWeek.reduce((s, c) => s + durationMinutes(c.startTime, c.endTime), 0);

  // Classes per ISO week for the last 8 weeks (oldest -> newest), for a bar chart.
  const byWeek = [];
  for (let i = 7; i >= 0; i -= 1) {
    const ws = new Date(weekStart.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const we = new Date(ws.getTime() + 7 * 24 * 60 * 60 * 1000);
    const inWeek = classes.filter((c) => new Date(c.date) >= ws && new Date(c.date) < we);
    byWeek.push({
      weekStart: ws.toISOString().slice(0, 10),
      classes: inWeek.length,
      hours: Math.round((inWeek.reduce((s, c) => s + durationMinutes(c.startTime, c.endTime), 0) / 60) * 10) / 10,
    });
  }

  // Which weekday the mentor teaches most.
  const byWeekday = WEEKDAYS.map((name, idx) => ({
    weekday: name,
    classes: classes.filter((c) => new Date(c.date).getUTCDay() === idx).length,
  }));
  const busiestDay = [...byWeekday].sort((a, b) => b.classes - a.classes)[0];

  // Per-batch class counts, for "most-taught batch".
  const batchCounts = {};
  classes.forEach((c) => {
    batchCounts[c.batchCode] = (batchCounts[c.batchCode] || 0) + 1;
  });
  const topBatch = Object.entries(batchCounts).sort((a, b) => b[1] - a[1])[0];

  const topicsTaught = classes
    .filter((c) => c.topicsCovered?.trim())
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((c) => ({ _id: c._id, date: c.date, batchCode: c.batchCode, topicsCovered: c.topicsCovered }));

  return {
    counts: {
      total: classes.length,
      done: done.length,
      upcoming: upcoming.length,
      thisWeek: thisWeek.length,
      needsReview: classes.filter((c) => c.needsReview).length,
      batches: new Set(classes.map((c) => c.batchCode)).size,
      uploads: uploadCount,
    },
    hours: {
      done: Math.round((doneMinutes / 60) * 10) / 10,
      upcoming: Math.round((upcomingMinutes / 60) * 10) / 10,
      total: Math.round(((doneMinutes + upcomingMinutes) / 60) * 10) / 10,
      thisWeek: Math.round((thisWeekMinutes / 60) * 10) / 10,
      avgClassMinutes: classes.length ? Math.round((doneMinutes + upcomingMinutes) / classes.length) : 0,
    },
    topics: {
      planned: plans.length,
      covered: plans.filter((p) => p.done).length,
      remaining: plans.filter((p) => !p.done).length,
      logged: topicsTaught.length,
    },
    byWeek,
    byWeekday,
    busiestDay: busiestDay?.classes ? busiestDay.weekday : null,
    topBatch: topBatch ? { batchCode: topBatch[0], classes: topBatch[1] } : null,
    recentTopics: topicsTaught.slice(0, 8),
    upcomingClasses: upcoming.slice(0, 6),
  };
}

export async function listTopicPlans(batchCode) {
  const filter = batchCode ? { batchCode } : {};
  return JobTopicPlan.find(filter).sort({ batchCode: 1, order: 1, createdAt: 1 }).lean();
}

export async function createTopicPlan({ batchCode, title }) {
  const last = await JobTopicPlan.findOne({ batchCode }).sort({ order: -1 }).lean();
  const created = await JobTopicPlan.create({ batchCode: batchCode.trim(), title: title.trim(), order: (last?.order ?? -1) + 1 });
  return created.toObject();
}

export async function updateTopicPlan(id, payload) {
  const allowed = {};
  if (payload.title !== undefined) allowed.title = payload.title;
  if (payload.done !== undefined) allowed.done = payload.done;
  if (payload.order !== undefined) allowed.order = payload.order;
  const updated = await JobTopicPlan.findByIdAndUpdate(id, allowed, { new: true, runValidators: true }).lean();
  if (!updated) throw new ApiError(404, 'Topic not found');
  return updated;
}

export async function deleteTopicPlan(id) {
  const deleted = await JobTopicPlan.findByIdAndDelete(id).lean();
  if (!deleted) throw new ApiError(404, 'Topic not found');
  return deleted;
}
