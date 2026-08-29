import ExcelJS from 'exceljs';
import { ApiError } from './ApiError.js';

const STEM_ALIASES = ['stem', 'question', 'questionimage', 'diagram'];
const NUMBER_ALIASES = ['questionnumber', 'qno', 'qnumber', 'number', 'q'];
const OPTION_HEADER_RE = /^option\s*([a-z])$/i;
const EXT_TO_MIME = { png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', gif: 'image/gif' };

function normalizeHeader(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Finds the Question Number column (same aliases as
 * questionMetadataExcelParser.js's own — duplicated locally rather than
 * imported, to avoid touching that already-proven file at all), the Stem
 * column, and any "Option <letter>" columns (open-ended — "Option E"/"F"
 * etc. all recognized).
 */
function buildColumnMap(headerRow) {
  let numberCol = null;
  let stemCol = null;
  const optionCols = new Map();

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const raw = String(cell.value || '').trim();
    const norm = normalizeHeader(raw);
    if (NUMBER_ALIASES.includes(norm)) {
      numberCol = colNumber;
    } else if (STEM_ALIASES.includes(norm)) {
      stemCol = colNumber;
    } else {
      const match = OPTION_HEADER_RE.exec(raw);
      if (match) optionCols.set(match[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0), colNumber);
    }
  });

  return { numberCol, stemCol, optionCols };
}

/**
 * Reads a sheet's embedded/pasted images and maps each one to a question
 * number (via the image's anchor row -> that row's Question Number cell)
 * and a role (Stem, or a specific Option <letter> column, via the image's
 * anchor column against the header map). This is an independent second
 * load of the same buffer parseQuestionMetadataFromExcelBuffer also reads
 * — kept deliberately separate so that already-proven parser is never
 * touched. Returns the same Map<questionNumber, {stem, options:
 * Map<letterIndex, {buffer, mimetype}>}> shape
 * question.service.js's own groupScreenshotsByQuestion produces, so it
 * flows straight into the existing buildContiguousOptions unchanged.
 */
export async function extractExcelScreenshotGroups(buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new ApiError(400, "Could not read the Excel file — make sure it's a valid, unprotected .xlsx or .xls file.");
  }

  const sheet = workbook.worksheets[0];
  const warnings = [];
  const groups = new Map();
  if (!sheet) {
    warnings.push('The uploaded sheet has no worksheets.');
    return { groups, warnings };
  }

  const { numberCol, stemCol, optionCols } = buildColumnMap(sheet.getRow(1));
  if (!numberCol) {
    warnings.push('Missing required column: Question Number (accepts "Q#", "Question Number", "Q No", etc).');
    return { groups, warnings };
  }
  if (!stemCol && optionCols.size === 0) {
    warnings.push('No "Stem" or "Option <letter>" columns found — nothing to extract images from.');
    return { groups, warnings };
  }

  sheet.getImages().forEach((img) => {
    const media = workbook.model.media.find((m) => m.index === img.imageId);
    if (!media) return;

    // Anchors are 0-indexed; round to the nearest cell for an image that
    // isn't perfectly aligned to cell boundaries, then convert to
    // ExcelJS's 1-indexed row/column addressing.
    const rowNumber = Math.round(img.range.tl.nativeRow) + 1;
    const colNumber = Math.round(img.range.tl.nativeCol) + 1;

    const numberCellValue = sheet.getRow(rowNumber).getCell(numberCol).value;
    const questionNumber = Number(numberCellValue);
    if (!numberCellValue || !Number.isInteger(questionNumber) || questionNumber < 1) {
      warnings.push(`An image near row ${rowNumber} isn't in a row with a valid Question Number — skipped.`);
      return;
    }

    const mimetype = EXT_TO_MIME[media.extension] || `image/${media.extension}`;
    const file = { buffer: media.buffer, mimetype };

    if (!groups.has(questionNumber)) groups.set(questionNumber, { stem: null, options: new Map() });
    const group = groups.get(questionNumber);

    if (stemCol && colNumber === stemCol) {
      if (group.stem) warnings.push(`Question ${questionNumber}: more than one stem image found — using the last one.`);
      group.stem = file;
      return;
    }

    let matchedLetter = null;
    for (const [index, col] of optionCols) {
      if (col === colNumber) {
        matchedLetter = index;
        break;
      }
    }
    if (matchedLetter === null) {
      warnings.push(`Question ${questionNumber}: found an image in a column that isn't Stem or an Option column — skipped.`);
      return;
    }
    if (group.options.has(matchedLetter)) {
      warnings.push(
        `Question ${questionNumber}, option ${String.fromCharCode(65 + matchedLetter)}: more than one image found — using the last one.`
      );
    }
    group.options.set(matchedLetter, file);
  });

  return { groups, warnings };
}
