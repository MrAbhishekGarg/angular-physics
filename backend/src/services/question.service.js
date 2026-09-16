import Question from '../models/Question.js';
import { ApiError } from '../utils/ApiError.js';
import { parseQuestionMetadataFromExcelBuffer } from '../utils/questionMetadataExcelParser.js';
import { extractExcelScreenshotGroups } from '../utils/excelScreenshotParser.js';
import { extractDocxScreenshotGroups } from '../utils/docxScreenshotParser.js';
import { saveQuestionImage } from '../utils/questionImageStorage.js';
import { getConceptCodeMap } from './conceptCode.service.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getAllQuestions({ examType, chapter, topic, difficulty, search, isPYQ, author, tag, subject, conceptCode } = {}) {
  const filter = {};
  // Mongo/Mongoose matches a scalar against an array field as "array
  // contains this value" — no $in needed for a single filter value.
  if (examType) filter.examTypes = examType;
  if (chapter) filter.chapter = chapter;
  if (topic) filter.topic = topic;
  if (difficulty) filter.difficulty = difficulty;
  if (search) filter.text = { $regex: search, $options: 'i' };
  if (isPYQ !== undefined) filter.isPYQ = isPYQ;
  if (author) filter.author = { $regex: `^${escapeRegex(author)}$`, $options: 'i' };
  if (tag) filter.tags = { $regex: `^${escapeRegex(tag)}$`, $options: 'i' };
  if (subject) filter.subject = { $regex: `^${escapeRegex(subject)}$`, $options: 'i' };
  if (conceptCode) filter.conceptCodes = conceptCode.toUpperCase();

  return Question.find(filter).sort({ createdAt: -1 }).lean();
}

export async function getTaxonomy({ examType } = {}) {
  const filter = examType ? { examTypes: examType } : {};
  const [chapters, topics, pyqYears, authors, subjects, tags] = await Promise.all([
    Question.distinct('chapter', { ...filter, chapter: { $ne: '' } }),
    Question.distinct('topic', { ...filter, topic: { $ne: '' } }),
    Question.distinct('pyqYear', { ...filter, isPYQ: true, pyqYear: { $ne: null } }),
    Question.distinct('author', { ...filter, author: { $ne: '' } }),
    // Older questions predating the subject/tags fields have neither
    // stored at all — Mongo's distinct() reports that as a literal `null`
    // entry, not just an absence, so filter it out explicitly rather than
    // relying on a query-side $ne (which doesn't catch "field missing").
    Question.distinct('subject', { ...filter, subject: { $ne: '' } }).then((arr) => arr.filter(Boolean)),
    Question.distinct('tags', filter).then((arr) => arr.filter(Boolean)),
  ]);
  return {
    chapters: chapters.sort(),
    topics: topics.sort(),
    pyqYears: pyqYears.sort((a, b) => b - a),
    authors: authors.sort(),
    subjects: subjects.sort(),
    tags: tags.sort(),
  };
}

export async function getQuestionById(id) {
  const question = await Question.findById(id).lean();
  if (!question) throw new ApiError(404, 'Question not found');
  return question;
}

export async function createQuestion(payload) {
  const question = await Question.create(payload);
  return question.toObject();
}

export async function updateQuestion(id, payload) {
  const question = await Question.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean();
  if (!question) throw new ApiError(404, 'Question not found');
  return question;
}

export async function deleteQuestion(id) {
  const question = await Question.findByIdAndDelete(id).lean();
  if (!question) throw new ApiError(404, 'Question not found');
  return question;
}

function resolveExamTypes({ rowOrTagExamTypes, batchExamType }) {
  if (rowOrTagExamTypes !== undefined && rowOrTagExamTypes !== null) return rowOrTagExamTypes;
  if (batchExamType) return [batchExamType];
  return [];
}

/**
 * Resolves a list of concept codes against the mentor-maintained map:
 * chapter/topic come from the FIRST recognized code (first-wins, since
 * Question.chapter/topic are still single-value fields). Unrecognized codes
 * get a warning but don't block the question — they're still stored on
 * conceptCodes in case the code gets created later.
 */
function resolveConceptCodes(codes, conceptCodeMap, warnings, questionLabel) {
  let taxonomyOverride = null;
  codes.forEach((code) => {
    const match = conceptCodeMap.get(code);
    if (match) {
      if (!taxonomyOverride) taxonomyOverride = { chapter: match.chapter, topic: match.topic };
    } else {
      warnings.push(`${questionLabel}: concept code "${code}" not found — used the batch's chapter/topic instead.`);
    }
  });
  return { taxonomyOverride };
}

/**
 * Merges each "skeleton" question (already carrying whatever text/imageUrl/
 * inline-answer content its own source produced — a parsed docx paragraph,
 * or a grouped batch of screenshots, see bulkCreateFromScreenshotsAndExcel)
 * with its matching Excel row by questionNumber, and inserts the result.
 * Shared by every "...AndExcel" bulk-upload flow so the actual metadata
 * merge rules (Excel wins over any inline signal, answer→index mapping,
 * concept-code resolution, exam-type/chapter/topic/marks/tags/PYQ fallback
 * chains) live in exactly one place.
 */
async function mergeAndInsertQuestions(skeletons, rowsByNumber, conceptCodeMap, { examType, chapter, topic, difficulty, author, subject, tags }) {
  const warnings = [];
  const toInsert = [];
  const matchedNumbers = new Set();

  skeletons.forEach((q) => {
    const row = rowsByNumber.get(q.questionNumber);
    if (!row) {
      warnings.push(`Question ${q.questionNumber}: no matching row in the Excel sheet — skipped.`);
      return;
    }
    matchedNumbers.add(q.questionNumber);

    // The row's own Concept Code(s) column wins over whatever the skeleton's
    // own source already resolved (e.g. a docx's inline [CC:...] tags) —
    // same "Excel is authoritative" rule as every other field. Only fall
    // back to the skeleton's own resolution when the row doesn't list any
    // codes at all.
    let taxonomyOverride;
    let finalConceptCodes;
    if (row.conceptCodes.length > 0) {
      const resolved = resolveConceptCodes(row.conceptCodes, conceptCodeMap, warnings, `Question ${q.questionNumber}`);
      taxonomyOverride = resolved.taxonomyOverride;
      finalConceptCodes = row.conceptCodes;
    } else {
      taxonomyOverride = q.chapter !== undefined || q.topic !== undefined ? { chapter: q.chapter, topic: q.topic } : null;
      finalConceptCodes = q.conceptCodes || [];
    }

    const finalType = row.type || q.type;

    let correctOptionIndexes = q.correctOptionIndexes;
    let correctNumericAnswer = q.correctNumericAnswer;
    if (row.answer) {
      if (finalType === 'numerical') {
        const num = Number(row.answer);
        if (Number.isNaN(num)) {
          warnings.push(`Question ${q.questionNumber}: Excel answer "${row.answer}" is not a number — skipped.`);
          return;
        }
        correctNumericAnswer = num;
        correctOptionIndexes = [];
      } else {
        const indexes = row.answer
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .map((l) => l.charCodeAt(0) - 'A'.charCodeAt(0));
        if (indexes.some((i) => i < 0 || i >= q.options.length)) {
          warnings.push(`Question ${q.questionNumber}: Excel answer "${row.answer}" doesn't match an option letter — skipped.`);
          return;
        }
        correctOptionIndexes = indexes;
        correctNumericAnswer = undefined;
      }
    }

    const hasAnswer = finalType === 'numerical' ? correctNumericAnswer !== undefined : correctOptionIndexes.length > 0;
    if (!hasAnswer) {
      warnings.push(`Question ${q.questionNumber}: no answer found — provide one in the Excel sheet.`);
      return;
    }

    toInsert.push({
      ...q,
      type: finalType,
      correctOptionIndexes,
      correctNumericAnswer,
      numericTolerance: row.tolerance ?? q.numericTolerance,
      marks: row.marks ?? q.marks,
      negativeMarks: row.negativeMarks ?? q.negativeMarks,
      examTypes: resolveExamTypes({
        rowOrTagExamTypes: row.examTypes,
        batchExamType: examType,
      }),
      chapter: taxonomyOverride?.chapter ?? (row.chapter || chapter),
      topic: taxonomyOverride?.topic ?? (row.topic || topic),
      conceptCodes: finalConceptCodes,
      subject: row.subject || subject || '',
      difficulty: row.difficulty || difficulty || 'medium',
      author: row.author || author || '',
      tags: row.tags.length > 0 ? row.tags : tags || [],
      isPYQ: row.isPYQ,
      pyqYear: row.isPYQ ? row.pyqYear || undefined : undefined,
    });
  });

  // Excel rows that never matched a skeleton question (typo'd number, or
  // that question failed to parse/group from its source at all) are worth
  // flagging too, not just silently ignored.
  rowsByNumber.forEach((_row, number) => {
    if (!matchedNumbers.has(number)) {
      warnings.push(`Excel row for question ${number}: no matching question found.`);
    }
  });

  const created = await Question.insertMany(
    toInsert.map(({ questionNumber, ...rest }) => rest),
    { ordered: false }
  );

  return { created: created.map((q) => q.toObject()), warnings };
}

const SCREENSHOT_FILENAME_RE = /^Q(\d+)(?:-([A-Za-z]))?\.(png|jpe?g|webp)$/i;

/**
 * Groups a flat list of uploaded screenshot files by the question number in
 * their filename — "Q1.png" is the stem/diagram, "Q1-A.png"/"Q1-B.png"/...
 * are options. Files that don't match the naming convention are warned
 * about and skipped rather than silently dropped.
 */
function groupScreenshotsByQuestion(files, warnings) {
  const groups = new Map();

  files.forEach((file) => {
    const match = SCREENSHOT_FILENAME_RE.exec(file.originalname);
    if (!match) {
      warnings.push(`File "${file.originalname}": doesn't match the expected naming pattern (Q1.png, Q1-A.png, etc.) — skipped.`);
      return;
    }
    const number = Number(match[1]);
    const letter = match[2];

    if (!groups.has(number)) groups.set(number, { stem: null, options: new Map() });
    const group = groups.get(number);

    if (!letter) {
      if (group.stem) warnings.push(`Question ${number}: more than one stem image uploaded — using the last one.`);
      group.stem = file;
    } else {
      const index = letter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
      if (group.options.has(index)) warnings.push(`Question ${number}, option ${letter.toUpperCase()}: more than one image uploaded — using the last one.`);
      group.options.set(index, file);
    }
  });

  return groups;
}

/**
 * Orders a question's option-image files A, B, C, ... — returns null (after
 * pushing a warning) if there's a gap, since a gap would silently shift
 * every later option's index and misalign it against the Excel answer
 * letter. An empty map (no option files at all) is valid — a numerical
 * question needs only a stem.
 */
function buildContiguousOptions(optionsMap, questionNumber, warnings) {
  if (optionsMap.size === 0) return [];

  const maxIndex = Math.max(...optionsMap.keys());
  const options = [];
  for (let i = 0; i <= maxIndex; i += 1) {
    if (!optionsMap.has(i)) {
      warnings.push(
        `Question ${questionNumber}: option ${String.fromCharCode(65 + i)} has no image or typed value (found others but not this one) — question skipped.`
      );
      return null;
    }
    options.push(optionsMap.get(i));
  }
  return options;
}

/**
 * Bulk upload from mentor-captured screenshots instead of a parsed Word
 * doc — for when a document's typed symbols/equations extract incorrectly
 * (e.g. characters typed in a special font that don't map to the Unicode
 * codepoint the doc actually stores). Each screenshot is stored exactly as
 * uploaded via saveQuestionImage — no parsing, no font-decoding, no
 * image-conversion step of any kind, so nothing can be misread. Metadata
 * (answer, marks, chapter, etc.) comes entirely from the same Excel mapping
 * sheet the Word+Excel flow uses — reuses mergeAndInsertQuestions, so the
 * merge rules live in exactly one place.
 */
/**
 * A group's per-slot file carries an image, typed text, or both:
 * groupScreenshotsByQuestion/extractExcelScreenshotGroups only ever produce
 * image-only slots (a raw { buffer, mimetype } pair still needing
 * saveQuestionImage), while extractDocxScreenshotGroups's slots can carry
 * typed `text` alongside an already-saved `imageUrl` (its
 * extractParagraphImage helper saves — and WMF/EMF-converts — as part of
 * extraction, so there's no raw buffer left to hand back there).
 */
function resolveSlotContent(file) {
  const imageUrl = file.imageUrl ?? (file.buffer ? saveQuestionImage(file.buffer, file.mimetype) : undefined);
  return { text: file.text || '', imageUrl };
}

/**
 * Turns { questionNumber -> { stem, options: Map<letterIndex, file> } }
 * groups (from groupScreenshotsByQuestion, extractExcelScreenshotGroups, or
 * extractDocxScreenshotGroups — same Map shape, see resolveSlotContent above
 * for the one difference in what a "file" looks like) into skeleton
 * questions ready for mergeAndInsertQuestions. Shared by every
 * screenshot-sourced bulk-upload flow.
 */
function buildSkeletonsFromGroups(groups, warnings, missingStemMessage) {
  const skeletons = [];

  for (const [number, group] of groups) {
    if (!group.stem) {
      warnings.push(missingStemMessage(number));
      continue;
    }
    const optionFiles = buildContiguousOptions(group.options, number, warnings);
    if (optionFiles === null) continue;

    const stemContent = resolveSlotContent(group.stem);
    const options = optionFiles.map((file) => resolveSlotContent(file));

    skeletons.push({
      questionNumber: number,
      type: options.length === 0 ? 'numerical' : 'mcq-single',
      text: stemContent.text,
      imageUrl: stemContent.imageUrl,
      options,
      correctOptionIndexes: [],
      correctNumericAnswer: undefined,
      numericTolerance: 0,
      marks: 4,
      negativeMarks: 1,
      chapter: undefined,
      topic: undefined,
      conceptCodes: [],
    });
  }

  return skeletons;
}

export async function bulkCreateFromScreenshotsAndExcel(imageFiles, excelBuffer, batchDefaults) {
  const conceptCodeMap = await getConceptCodeMap();
  const { rowsByNumber, warnings: excelWarnings } = await parseQuestionMetadataFromExcelBuffer(excelBuffer);

  const warnings = [...excelWarnings];
  const groups = groupScreenshotsByQuestion(imageFiles, warnings);
  const skeletons = buildSkeletonsFromGroups(
    groups,
    warnings,
    (n) => `Question ${n}: no stem/question image found (expected "Q${n}.png") — skipped.`
  );

  const { created, warnings: mergeWarnings } = await mergeAndInsertQuestions(skeletons, rowsByNumber, conceptCodeMap, batchDefaults);

  return { questions: created, warnings: [...warnings, ...mergeWarnings] };
}

/**
 * Bulk upload from a single Excel file with screenshots pasted directly
 * into "Stem"/"Option <letter>" cells — the whole batch (metadata AND
 * visual content) lives in one spreadsheet, no separate image files or
 * Word doc needed. Metadata comes from the same column conventions
 * parseQuestionMetadataFromExcelBuffer already reads; images come from
 * extractExcelScreenshotGroups, which independently re-reads the same
 * buffer for its embedded pictures and their cell positions. Reuses
 * buildSkeletonsFromGroups/mergeAndInsertQuestions, so this flow adds only
 * "where do the images come from" — everything else is shared.
 */
export async function bulkCreateFromExcelScreenshots(excelBuffer, batchDefaults) {
  const conceptCodeMap = await getConceptCodeMap();
  const [{ rowsByNumber, warnings: excelWarnings }, { groups, warnings: imageWarnings }] = await Promise.all([
    parseQuestionMetadataFromExcelBuffer(excelBuffer),
    extractExcelScreenshotGroups(excelBuffer),
  ]);

  const warnings = [...excelWarnings, ...imageWarnings];
  const skeletons = buildSkeletonsFromGroups(
    groups,
    warnings,
    (n) => `Question ${n}: no stem image found in the "Stem" column — skipped.`
  );

  const { created, warnings: mergeWarnings } = await mergeAndInsertQuestions(skeletons, rowsByNumber, conceptCodeMap, batchDefaults);

  return { questions: created, warnings: [...warnings, ...mergeWarnings] };
}

/**
 * Bulk upload from a Word doc used purely as a container for pasted
 * screenshots (Q1./A)/B)/... markers, one screenshot per marker — nothing is
 * ever read as typed text, so this can't hit the equation/font-decoding
 * failures the old typed-text docx parser had. Metadata/answers come from
 * the same paired Excel mapping sheet the other two "...AndExcel" flows use.
 * Reuses buildSkeletonsFromGroups/mergeAndInsertQuestions unchanged — this
 * flow adds only "where do the images come from."
 */
export async function bulkCreateFromDocxScreenshots(docxBuffer, excelBuffer, batchDefaults) {
  const conceptCodeMap = await getConceptCodeMap();
  const [{ rowsByNumber, warnings: excelWarnings }, { groups, warnings: imageWarnings }] = await Promise.all([
    parseQuestionMetadataFromExcelBuffer(excelBuffer),
    extractDocxScreenshotGroups(docxBuffer),
  ]);

  const warnings = [...excelWarnings, ...imageWarnings];
  const skeletons = buildSkeletonsFromGroups(
    groups,
    warnings,
    (n) => `Question ${n}: no image or typed text found after the "Q${n}." marker — skipped.`
  );

  const { created, warnings: mergeWarnings } = await mergeAndInsertQuestions(skeletons, rowsByNumber, conceptCodeMap, batchDefaults);

  return { questions: created, warnings: [...warnings, ...mergeWarnings] };
}

/**
 * Bulk upload from a mentor-reviewed JSON array of AI-extracted questions.
 * The extraction itself happens entirely outside this app — a Claude
 * conversation reads the source PDF and hands back this shape — so nothing
 * here calls any AI API. Diagram images the mentor pasted during review
 * already have real imageUrls attached (via the existing
 * POST /questions/upload-image endpoint the review screen calls per pasted
 * image) by the time this runs. Reuses mergeAndInsertQuestions unchanged —
 * this flow adds only "where do the skeletons come from."
 */
export async function commitExtractedQuestions(extractedQuestions, excelBuffer, batchDefaults) {
  const conceptCodeMap = await getConceptCodeMap();
  const { rowsByNumber, warnings: excelWarnings } = await parseQuestionMetadataFromExcelBuffer(excelBuffer);

  const warnings = [...excelWarnings];
  const skeletons = [];

  (Array.isArray(extractedQuestions) ? extractedQuestions : []).forEach((q, i) => {
    if (!q || typeof q.questionNumber !== 'number' || !q.type) {
      warnings.push(`Entry ${i + 1}: missing a question number or type — skipped.`);
      return;
    }
    const hasText = typeof q.text === 'string' && q.text.trim().length > 0;
    if (!hasText && !q.imageUrl) {
      warnings.push(`Question ${q.questionNumber}: no text and no image — skipped.`);
      return;
    }
    skeletons.push({
      questionNumber: q.questionNumber,
      text: q.text || '',
      imageUrl: q.imageUrl || undefined,
      options: Array.isArray(q.options) ? q.options.map((o) => ({ text: o?.text || '', imageUrl: o?.imageUrl || undefined })) : [],
      type: q.type,
      chapter: q.chapter || undefined,
      topic: q.topic || undefined,
      conceptCodes: Array.isArray(q.conceptCodes) ? q.conceptCodes : [],
    });
  });

  const { created, warnings: mergeWarnings } = await mergeAndInsertQuestions(skeletons, rowsByNumber, conceptCodeMap, batchDefaults);

  return { questions: created, warnings: [...warnings, ...mergeWarnings] };
}

/**
 * Randomly samples up to `count` matching questions — used both by the
 * student self-serve practice flow and an optional mentor "auto-fill"
 * convenience when building a test. Deliberately excludes unmapped
 * questions (empty examTypes) — sampling into "JEE Main practice" a
 * question nobody tagged as JEE Main relevant would be surprising.
 */
export async function generateQuestionSet({ examType, chapter, topic, difficulty, isPYQ, year, count = 10 }) {
  if (!examType) throw new ApiError(400, 'examType is required');
  const filter = { examTypes: examType };
  if (chapter) filter.chapter = chapter;
  if (topic) filter.topic = topic;
  if (difficulty) filter.difficulty = difficulty;
  if (isPYQ) {
    filter.isPYQ = true;
    if (year) filter.pyqYear = Number(year);
  }

  const questions = await Question.aggregate([{ $match: filter }, { $sample: { size: Number(count) } }]);
  if (questions.length === 0) {
    throw new ApiError(404, 'No questions match those filters yet — try broadening them.');
  }
  return questions;
}
