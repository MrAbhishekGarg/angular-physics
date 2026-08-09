import ExcelJS from 'exceljs';
import { TRACKS } from '../constants/tracks.js';
import { ApiError } from './ApiError.js';

const HEADER_ALIASES = {
  number: ['questionnumber', 'qno', 'qnumber', 'number', 'q'],
  type: ['type', 'questiontype'],
  conceptcodes: ['conceptcode', 'conceptcodes', 'cc', 'code', 'codes'],
  examtypes: ['examtype', 'examtypes', 'exam', 'exams', 'track', 'tracks'],
  subject: ['subject'],
  chapter: ['chapter'],
  topic: ['topic'],
  answer: ['answer', 'answerkey', 'correctanswer'],
  marks: ['marks'],
  negative: ['negative', 'negativemarks'],
  tolerance: ['tolerance'],
  author: ['author', 'source'],
  tags: ['tag', 'tags'],
  pyq: ['pyq', 'ispyq', 'previousyearquestion'],
  pyqyear: ['pyqyear', 'year'],
  difficulty: ['difficulty'],
};

const NONE_MARKERS = new Set(['none', 'unmapped', '-', 'n/a', 'na']);

// Strips ALL non-alphanumeric characters (not just whitespace/underscore) so
// "Exam Type(s)", "Q#", "Tag(s)" etc. all normalize the same as their
// punctuation-free alias — mentors' real sheets vary this kind of styling
// far more than the whitespace-only version of this function accounted for.
function normalizeHeader(raw) {
  return String(raw || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildHeaderMap(headerRow) {
  const map = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const norm = normalizeHeader(cell.value);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(norm)) map[field] = colNumber;
    }
  });
  return map;
}

function cellText(cell) {
  if (!cell) return '';
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v.richText)) return v.richText.map((rt) => rt.text).join('').trim();
  if (v.text !== undefined) return String(v.text).trim();
  if (v.result !== undefined) return String(v.result).trim();
  return String(v).trim();
}

function parseBoolean(text) {
  const norm = text.trim().toLowerCase();
  return norm === 'true' || norm === 'yes' || norm === 'y' || norm === '1';
}

function splitList(text) {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parses the per-question metadata sheet for the Word+Excel mapped bulk
 * upload — one row per question NUMBER (matched against the literal "Q<N>."
 * printed in the paired Word doc, not document order), supplying whatever
 * a plain-text question in Word can't express on its own: concept code,
 * exam type(s), subject, answer key, marks, author, tags, PYQ tagging, etc.
 *
 * Returns rowsByNumber (Map<number, {...}>) rather than an array, since
 * the whole point is number-keyed lookup against parsed doc questions —
 * an array would just get re-indexed by the caller anyway.
 */
export async function parseQuestionMetadataFromExcelBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new ApiError(400, 'Could not read the mapping sheet — make sure it\'s a valid, unprotected .xlsx or .xls file.');
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return { rowsByNumber: new Map(), warnings: ['The uploaded mapping sheet has no worksheets.'] };

  const headerMap = buildHeaderMap(sheet.getRow(1));
  if (!headerMap.number) {
    return {
      rowsByNumber: new Map(),
      warnings: ['Missing required column: Question Number (accepts "Q#", "Question Number", "Q No", etc).'],
    };
  }
  if (!headerMap.answer) {
    return {
      rowsByNumber: new Map(),
      warnings: ['Missing required column: Answer.'],
    };
  }

  const trackSet = new Set(TRACKS);
  const rowsByNumber = new Map();
  const warnings = [];

  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;

    const numberText = cellText(row.getCell(headerMap.number));
    if (!numberText) continue; // fully blank row — skip silently

    const number = Number(numberText);
    if (!Number.isInteger(number) || number < 1) {
      warnings.push(`Row ${r}: "${numberText}" is not a valid question number — skipped.`);
      continue;
    }
    if (rowsByNumber.has(number)) {
      warnings.push(`Row ${r}: question number ${number} is already mapped by an earlier row — this row was skipped.`);
      continue;
    }

    const typeRaw = headerMap.type ? cellText(row.getCell(headerMap.type)).toLowerCase().replace(/\s+/g, '-') : '';
    const type = ['mcq-single', 'mcq-multiple', 'numerical'].includes(typeRaw) ? typeRaw : null;
    if (typeRaw && !type) {
      warnings.push(`Row ${r} (Q${number}): unrecognized type "${typeRaw}" — ignored, type will be inferred instead.`);
    }

    // null = column absent or cell left blank -> caller falls back to the
    // concept code's / batch's exam type. An empty array (via "none") is a
    // deliberate, explicit "leave this question unmapped" override.
    let examTypes = null;
    const examTypesText = headerMap.examtypes ? cellText(row.getCell(headerMap.examtypes)) : '';
    if (examTypesText) {
      if (NONE_MARKERS.has(examTypesText.toLowerCase())) {
        examTypes = [];
      } else {
        const requested = splitList(examTypesText).map((t) => t.toLowerCase().replace(/\s+/g, '-'));
        const valid = requested.filter((t) => trackSet.has(t));
        const invalid = requested.filter((t) => !trackSet.has(t));
        if (invalid.length > 0) {
          warnings.push(`Row ${r} (Q${number}): unrecognized exam type(s) "${invalid.join(', ')}" — ignored. Expected: ${TRACKS.join(', ')}.`);
        }
        examTypes = valid;
      }
    }

    // A question can carry more than one Concept Code — comma-separated,
    // same convention as Exam Type(s)/Tag(s).
    const conceptCodes = headerMap.conceptcodes ? splitList(cellText(row.getCell(headerMap.conceptcodes)).toUpperCase()) : [];
    const subject = headerMap.subject ? cellText(row.getCell(headerMap.subject)) : '';
    const chapter = headerMap.chapter ? cellText(row.getCell(headerMap.chapter)) : '';
    const topic = headerMap.topic ? cellText(row.getCell(headerMap.topic)) : '';
    const answer = cellText(row.getCell(headerMap.answer));
    const marksText = headerMap.marks ? cellText(row.getCell(headerMap.marks)) : '';
    const negativeText = headerMap.negative ? cellText(row.getCell(headerMap.negative)) : '';
    const toleranceText = headerMap.tolerance ? cellText(row.getCell(headerMap.tolerance)) : '';
    const author = headerMap.author ? cellText(row.getCell(headerMap.author)) : '';
    const tags = headerMap.tags ? splitList(cellText(row.getCell(headerMap.tags))) : [];
    const isPYQ = headerMap.pyq ? parseBoolean(cellText(row.getCell(headerMap.pyq))) : false;
    const pyqYearText = headerMap.pyqyear ? cellText(row.getCell(headerMap.pyqyear)) : '';
    const difficultyRaw = headerMap.difficulty ? cellText(row.getCell(headerMap.difficulty)).toLowerCase() : '';
    const difficulty = ['easy', 'medium', 'hard'].includes(difficultyRaw) ? difficultyRaw : null;

    if (!answer) {
      warnings.push(`Row ${r} (Q${number}): missing Answer — this question will be skipped unless the Word doc has an inline answer.`);
    }

    // conceptCodes (if any) are resolved against the real ConceptCode map
    // by the caller, which has DB access this parser doesn't — a concept
    // code's own examType/chapter/topic wins over the plain columns below,
    // mirroring the docx [CC:] tag's precedence.
    rowsByNumber.set(number, {
      type,
      conceptCodes,
      examTypes,
      subject,
      chapter,
      topic,
      answer: answer || null,
      marks: marksText ? Number(marksText) : null,
      negativeMarks: negativeText ? Number(negativeText) : null,
      tolerance: toleranceText ? Number(toleranceText) : null,
      author,
      tags,
      isPYQ,
      pyqYear: pyqYearText ? Number(pyqYearText) : null,
      difficulty,
    });
  }

  return { rowsByNumber, warnings };
}
