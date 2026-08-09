import ExcelJS from 'exceljs';
import { ApiError } from './ApiError.js';

const HEADER_ALIASES = {
  code: ['code', 'conceptcode'],
  label: ['label', 'name', 'title'],
  chapter: ['chapter'],
  topic: ['topic'],
};

// Strips ALL non-alphanumeric characters, not just whitespace/underscore —
// see questionMetadataExcelParser.js's identical helper for why.
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

/** Reads a cell's display text regardless of ExcelJS's value shape (plain, rich text, formula, hyperlink). */
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

/**
 * Parses an uploaded Concept Codes workbook (first worksheet, header row
 * required) into upsert-ready rows. Header matching is case/whitespace
 * insensitive. Malformed/incomplete rows are collected as warnings and
 * skipped rather than failing the whole batch — mirrors the question
 * bulk-upload docx parser's error-tolerance shape.
 */
export async function parseConceptCodesFromExcelBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new ApiError(400, 'Could not read the Excel file — make sure it\'s a valid, unprotected .xlsx or .xls file.');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) return { rows: [], warnings: ['The uploaded file has no worksheets.'] };

  const headerMap = buildHeaderMap(sheet.getRow(1));
  const missing = ['code', 'label'].filter((f) => !headerMap[f]);
  if (missing.length > 0) {
    return {
      rows: [],
      warnings: [`Missing required column(s): ${missing.join(', ')}. Expected headers: Code, Label, Chapter, Topic.`],
    };
  }

  const rows = [];
  const warnings = [];

  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;

    const code = cellText(row.getCell(headerMap.code)).toUpperCase();
    const label = cellText(row.getCell(headerMap.label));
    const chapter = headerMap.chapter ? cellText(row.getCell(headerMap.chapter)) : '';
    const topic = headerMap.topic ? cellText(row.getCell(headerMap.topic)) : '';

    if (!code && !label) continue; // fully blank row — skip silently

    if (!code || !label) {
      warnings.push(`Row ${r}: missing code or label — skipped.`);
      continue;
    }

    rows.push({ code, label, chapter, topic });
  }

  return { rows, warnings };
}
