import fs from 'fs';
import path from 'path';
import JobClass from '../models/JobClass.js';
import JobScheduleUpload from '../models/JobScheduleUpload.js';
import JobTopicPlan from '../models/JobTopicPlan.js';
import JobBatch from '../models/JobBatch.js';
import { extractMyClassesFromPdf } from '../utils/scheduleGridParser.js';
import { durationMinutes, classifyDuration, isClassEnded } from '../utils/jobTime.js';
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

  // A PDF is fully consumed by extraction above — nothing in it is worth
  // keeping once its classes exist as structured JobClass rows, so it's
  // never written to disk at all. An image has no text layer to extract, so
  // it IS the content (the mentor references it visually) and still gets
  // archived.
  let filename = '';
  if (isImage) {
    const ext = EXT_BY_MIME[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.bin';
    filename = `${day.toISOString().slice(0, 10)}-${Date.now()}${ext}`;
    fs.writeFileSync(path.join(JOB_SCHEDULE_UPLOADS_DIR, filename), file.buffer);
  }

  // Re-uploading a day (a corrected PDF, or the same one again) used to be
  // rejected outright once that date already had an upload. Instead this
  // upserts the upload row — replacing its stored file — and below, every
  // class it re-extracts, matches against what's already there instead of
  // duplicating it.
  let upload = await JobScheduleUpload.findOne({ date: day });
  const previousStoredPath = upload?.storedPath;
  if (upload) {
    upload.originalFilename = file.originalname || '';
    upload.storedPath = filename;
    upload.isImage = isImage;
    upload.extractedCount = classes.length;
    upload.warnings = warnings;
    await upload.save();
    if (previousStoredPath && previousStoredPath !== filename) {
      fs.rm(path.join(JOB_SCHEDULE_UPLOADS_DIR, previousStoredPath), { force: true }, () => {});
    }
  } else {
    upload = await JobScheduleUpload.create({
      date: day,
      originalFilename: file.originalname || '',
      storedPath: filename, // relative — JOB_SCHEDULE_UPLOADS_DIR may differ across environments; empty for a PDF (see above)
      isImage,
      extractedCount: classes.length,
      warnings,
    });
  }

  // De-dup key: a slot is "the same class" if it's the same day, same start
  // time, same batch — regardless of source. A PDF-sourced match gets its
  // room/time/subject refreshed (the corrected value) and reattached to this
  // upload; a manual match is left completely alone (never overwrite an
  // entry the mentor typed in by hand) and simply isn't duplicated.
  const existingForDay = await JobClass.find({ date: day }).lean();
  const existingByKey = new Map(existingForDay.map((c) => [`${c.startTime}|${c.batchCode}`, c]));

  const toInsert = [];
  let refreshed = 0;
  for (const c of classes) {
    const dup = existingByKey.get(`${c.startTime}|${c.batchCode}`);
    if (dup) {
      if (dup.source === 'pdf') {
        await JobClass.updateOne(
          { _id: dup._id },
          { $set: { room: c.room, endTime: c.endTime, subjectPrefix: c.subjectPrefix, rawText: c.rawText, isDoubt: !!c.isDoubt, sourceUploadId: upload._id } }
        );
      }
      refreshed += 1;
      continue;
    }
    toInsert.push({
      date: day,
      dayOfWeek,
      startTime: c.startTime,
      endTime: c.endTime,
      room: c.room,
      batchCode: c.batchCode,
      subjectPrefix: c.subjectPrefix,
      rawText: c.rawText,
      isDoubt: !!c.isDoubt,
      needsReview: true,
      source: 'pdf',
      sourceUploadId: upload._id,
    });
  }

  const created = toInsert.length ? await JobClass.insertMany(toInsert) : [];
  if (refreshed > 0) {
    warnings.push(`${refreshed} class${refreshed === 1 ? '' : 'es'} already existed for this day and ${refreshed === 1 ? 'was' : 'were'} matched instead of duplicated.`);
  }

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
  const clash = await JobClass.findOne({ date: day, startTime: payload.startTime, batchCode: payload.batchCode }).lean();
  if (clash) throw new ApiError(409, 'A class already exists for that batch at that date and time.');

  const created = await JobClass.create({
    date: day,
    dayOfWeek: payload.dayOfWeek || day.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
    startTime: payload.startTime,
    endTime: payload.endTime || '',
    room: payload.room || '',
    batchCode: payload.batchCode,
    subjectPrefix: payload.subjectPrefix || 'Physics',
    plannedTopics: payload.plannedTopics || '',
    topicsCovered: payload.topicsCovered || '',
    notes: payload.notes || '',
    isDoubt: !!payload.isDoubt,
    needsReview: false,
    source: 'manual',
  });
  return created.toObject();
}

/**
 * Editing a class always clears the extraction-review flag (the mentor
 * having looked at the row is what that flag exists to prompt). `reviewed`
 * — the separate post-class review state — is only touched when the caller
 * passes it explicitly (the "Mark as taught" action). Every field is
 * editable, including date/time/room/batch — moving a class or fixing a
 * wrong batch shouldn't require deleting and re-adding it — except
 * source/sourceUploadId, which track provenance rather than content.
 */
export async function updateClass(id, payload) {
  const update = { ...payload, needsReview: false };
  delete update.source;
  delete update.sourceUploadId;

  if (update.date !== undefined) {
    const day = startOfDay(new Date(update.date));
    if (Number.isNaN(day.getTime())) throw new ApiError(400, 'That date is not valid.');
    update.date = day;
  }

  if (update.date || update.startTime || update.batchCode) {
    const current = await JobClass.findById(id).lean();
    if (!current) throw new ApiError(404, 'Class not found');
    const date = update.date || current.date;
    const startTime = update.startTime ?? current.startTime;
    const batchCode = update.batchCode ?? current.batchCode;
    const clash = await JobClass.findOne({ _id: { $ne: id }, date, startTime, batchCode }).lean();
    if (clash) throw new ApiError(409, 'Another class already exists for that batch at that date and time.');
    if (update.date) update.dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  }

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
      if (upload?.storedPath) {
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

  if (upload.storedPath) {
    const filePath = path.join(JOB_SCHEDULE_UPLOADS_DIR, upload.storedPath);
    fs.rm(filePath, { force: true }, () => {});
  }

  return upload;
}

/**
 * Batches aren't a required entity — a code is a batch the moment any
 * JobClass/JobTopicPlan references it — but the mentor also wants to
 * rename a code, mark one as a "Doubt" batch, or register a batch before
 * it's ever taught. This registry attaches those facts to a code without
 * requiring one to exist first: editing a not-yet-registered code upserts
 * it, and renaming cascades to every class/plan carrying the old code so
 * the code stays the one join key across the module.
 */
export async function updateBatch(code, { code: newCode, type, scheduleType } = {}) {
  let batch = await JobBatch.findOne({ code });
  if (!batch) batch = new JobBatch({ code, type: 'Regular' });

  if (type !== undefined) batch.type = type === 'Doubt' ? 'Doubt' : 'Regular';
  if (scheduleType !== undefined) {
    batch.scheduleType = ['weekend', 'semi-weekend'].includes(scheduleType) ? scheduleType : 'regular';
  }

  const trimmedNew = newCode !== undefined ? String(newCode).trim() : null;
  if (trimmedNew !== null) {
    if (!trimmedNew) throw new ApiError(400, 'Batch code cannot be empty.');
    if (trimmedNew !== code) {
      const clash = await JobBatch.findOne({ code: trimmedNew }).lean();
      if (clash) throw new ApiError(409, `Batch "${trimmedNew}" already exists.`);
      batch.code = trimmedNew;
    }
  }

  await batch.save();

  if (batch.code !== code) {
    await Promise.all([
      JobClass.updateMany({ batchCode: code }, { $set: { batchCode: batch.code } }),
      JobTopicPlan.updateMany({ batchCode: code }, { $set: { batchCode: batch.code } }),
    ]);
  }

  return batch.toObject();
}

/**
 * Removes only the registry row (the type, and the fact it was explicitly
 * registered) — never the classes/plans under that code, which is what
 * still makes it "a batch" if any exist.
 */
export async function deleteBatch(code) {
  const deleted = await JobBatch.findOneAndDelete({ code }).lean();
  if (!deleted) throw new ApiError(404, 'Batch not found');
  return deleted;
}

export async function getBatchSummaries() {
  const now = new Date();
  const [classes, plans, registry] = await Promise.all([
    JobClass.find().sort({ date: -1, startTime: -1 }).lean(),
    JobTopicPlan.find().sort({ order: 1, createdAt: 1 }).lean(),
    JobBatch.find().lean(),
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

  const typeByCode = new Map(registry.map((b) => [b.code, b.type]));
  const scheduleTypeByCode = new Map(registry.map((b) => [b.code, b.scheduleType]));

  const codes = new Set([...byBatch.keys(), ...plansByBatch.keys(), ...typeByCode.keys()]);

  return [...codes]
    .map((code) => {
      const cs = byBatch.get(code) || [];
      const plan = plansByBatch.get(code) || [];
      const minutes = cs.reduce((sum, c) => sum + durationMinutes(c.startTime, c.endTime), 0);
      // "Done" = the class's actual end time has passed — not yet started
      // and currently in progress both still count as upcoming.
      const past = cs.filter((c) => isClassEnded(c, now));
      const future = cs.filter((c) => !isClassEnded(c, now));
      return {
        batchCode: code,
        type: typeByCode.get(code) || 'Regular',
        scheduleType: scheduleTypeByCode.get(code) || 'regular',
        classCount: cs.length,
        doneCount: past.length,
        upcomingCount: future.length,
        toReviewCount: past.filter((c) => !c.reviewed).length,
        hours: Math.round((minutes / 60) * 10) / 10,
        // most-recent past class, and soonest upcoming — never conflate the
        // two (a future class isn't something that was "taught").
        lastTaught: past.length ? past.reduce((mx, c) => (c.date > mx ? c.date : mx), past[0].date) : null,
        nextClass: future.length ? future.reduce((mn, c) => (c.date < mn ? c.date : mn), future[0].date) : null,
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
          plannedTopics: c.plannedTopics,
          topicsCovered: c.topicsCovered,
          notes: c.notes,
          reviewed: c.reviewed,
          needsReview: c.needsReview,
          isDoubt: c.isDoubt,
        })),
      };
    })
    .sort((a, b) => {
      // Most recently active batch first — a batch with an upcoming class
      // but no past one still ranks by that upcoming date.
      const aT = new Date(a.lastTaught || a.nextClass || 0).getTime();
      const bT = new Date(b.lastTaught || b.nextClass || 0).getTime();
      return bT - aT;
    });
}

/**
 * One aggregate call powering the "My Job" overview dashboard — every
 * headline number the mentor asked for, derived from the class log plus the
 * topic-plan checklist. A class counts as "done" once its real end time has
 * passed (see isClassEnded) — not yet started and currently in progress
 * both still count as "upcoming". "To review" is a done class the mentor
 * hasn't yet confirmed what was taught in.
 */
export async function getDashboard() {
  const now = new Date();
  const [classes, plans, uploadCount] = await Promise.all([
    JobClass.find().sort({ date: 1, startTime: 1 }).lean(),
    JobTopicPlan.find().lean(),
    JobScheduleUpload.countDocuments(),
  ]);

  const done = classes.filter((c) => isClassEnded(c, now));
  const upcoming = classes.filter((c) => !isClassEnded(c, now));
  const doneMinutes = done.reduce((s, c) => s + durationMinutes(c.startTime, c.endTime), 0);
  const upcomingMinutes = upcoming.reduce((s, c) => s + durationMinutes(c.startTime, c.endTime), 0);
  const toReview = done.filter((c) => !c.reviewed);

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

  // How the class load breaks down by length — "1 hr classes" vs "2 hr
  // classes" — a ±10 min tolerance either side of the nominal length.
  const durationCounts = { oneHour: 0, twoHour: 0, other: 0 };
  classes.forEach((c) => {
    const bucket = classifyDuration(durationMinutes(c.startTime, c.endTime));
    if (bucket === '1hr') durationCounts.oneHour += 1;
    else if (bucket === '2hr') durationCounts.twoHour += 1;
    else durationCounts.other += 1;
  });

  return {
    counts: {
      total: classes.length,
      done: done.length,
      upcoming: upcoming.length,
      toReview: toReview.length,
      thisWeek: thisWeek.length,
      extractionReview: classes.filter((c) => c.needsReview).length,
      batches: new Set(classes.map((c) => c.batchCode)).size,
      uploads: uploadCount,
      oneHourClasses: durationCounts.oneHour,
      twoHourClasses: durationCounts.twoHour,
      otherDurationClasses: durationCounts.other,
      doubtClasses: classes.filter((c) => c.isDoubt).length,
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
    // Not-yet-ended classes, soonest first — today's remaining classes lead
    // the list (they haven't ended, so they belong here even though "today"
    // isn't literally "upcoming" in the calendar sense), then later days.
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
