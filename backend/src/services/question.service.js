import Question from '../models/Question.js';
import { ApiError } from '../utils/ApiError.js';
import { parseQuestionsFromDocxBuffer } from '../utils/questionsDocxParser.js';
import { parseQuestionMetadataFromExcelBuffer } from '../utils/questionMetadataExcelParser.js';
import { saveQuestionImage } from '../utils/questionImageStorage.js';
import { getConceptCodeMap } from './conceptCode.service.js';

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
  if (author) filter.author = author;
  if (tag) filter.tags = tag;
  if (subject) filter.subject = subject;
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
 * Parses a bulk-upload docx (same image-rendering pipeline used previously
 * for direct Test authoring) and persists each parsed question straight
 * into the bank, tagged uniformly with the batch's examType/chapter/topic/
 * difficulty — mentors can retag individual questions afterward if needed.
 */
export async function bulkCreateFromDocx(buffer, { examType, chapter, topic, difficulty, isPYQ, pyqYear, author, subject, tags }) {
  const conceptCodeMap = await getConceptCodeMap();
  const { questions, warnings } = await parseQuestionsFromDocxBuffer(buffer, conceptCodeMap);

  const created = await Question.insertMany(
    // A question tagged with one or more recognized [CC:code] tags carries
    // its own examTypes/chapter/topic (set by the parser) which wins over
    // the batch-level defaults from the upload form; difficulty/PYQ/author/
    // subject/tags stay batch-level only since ConceptCode has no such fields.
    questions.map((q) => ({
      ...q,
      examTypes: resolveExamTypes({ batchExamType: examType }),
      chapter: q.chapter ?? chapter,
      topic: q.topic ?? topic,
      difficulty,
      isPYQ,
      pyqYear: isPYQ ? pyqYear : undefined,
      author: author || '',
      subject: subject || '',
      tags: tags || [],
    })),
    { ordered: false }
  );

  return { questions: created.map((q) => q.toObject()), warnings };
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

/**
 * The "type in Word, tag in Excel" bulk upload — a Word doc with nothing
 * but question text/options (no inline Answer:/Marks:/[CC:] tags required),
 * paired with an Excel sheet mapping every piece of grading/taxonomy
 * metadata to a question by its literal printed number ("Q7." -> row where
 * Question Number = 7). Lets a mentor type questions freely without
 * worrying about exact tag syntax, then manage answers/concept
 * codes/author/PYQ tagging in a spreadsheet — easier to bulk-edit, sort,
 * and eyeball for consistency across a large batch than inline doc tags.
 *
 * Excel values win over any inline docx tag the mentor typed anyway (a
 * mentor can still write "Answer: A" in the doc as a fallback/reference,
 * but the sheet is treated as the source of truth whenever it specifies a
 * field). A question with no answer from EITHER source is skipped with a
 * warning, same as the docx-only flow's missing-Answer handling.
 */
export async function bulkCreateFromDocxAndExcel(docxBuffer, excelBuffer, batchDefaults) {
  const conceptCodeMap = await getConceptCodeMap();
  const [{ questions: parsedQuestions, warnings: docxWarnings }, { rowsByNumber, warnings: excelWarnings }] = await Promise.all([
    parseQuestionsFromDocxBuffer(docxBuffer, conceptCodeMap, { requireInlineAnswer: false }),
    parseQuestionMetadataFromExcelBuffer(excelBuffer),
  ]);

  const { created, warnings: mergeWarnings } = await mergeAndInsertQuestions(parsedQuestions, rowsByNumber, conceptCodeMap, batchDefaults);

  return { questions: created, warnings: [...docxWarnings, ...excelWarnings, ...mergeWarnings] };
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
        `Question ${questionNumber}: option ${String.fromCharCode(65 + i)} is missing an image (found others but not this one) — question skipped.`
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
export async function bulkCreateFromScreenshotsAndExcel(imageFiles, excelBuffer, batchDefaults) {
  const conceptCodeMap = await getConceptCodeMap();
  const { rowsByNumber, warnings: excelWarnings } = await parseQuestionMetadataFromExcelBuffer(excelBuffer);

  const warnings = [...excelWarnings];
  const groups = groupScreenshotsByQuestion(imageFiles, warnings);
  const skeletons = [];

  for (const [number, group] of groups) {
    if (!group.stem) {
      warnings.push(`Question ${number}: no stem/question image found (expected "Q${number}.png") — skipped.`);
      continue;
    }
    const optionFiles = buildContiguousOptions(group.options, number, warnings);
    if (optionFiles === null) continue;

    const imageUrl = saveQuestionImage(group.stem.buffer, group.stem.mimetype);
    const options = optionFiles.map((file) => ({ text: '', imageUrl: saveQuestionImage(file.buffer, file.mimetype) }));

    skeletons.push({
      questionNumber: number,
      type: options.length === 0 ? 'numerical' : 'mcq-single',
      text: '',
      imageUrl,
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
