/**
 * Extracts one faculty member's own classes out of Aakash's daily "Class
 * Schedule" PDF — a dense page of several side-by-side mini-tables (one per
 * room-cluster), each with a "Room" header row, a "BATCHES" header row, then
 * time-slot rows whose cells read like "P/AGP" (subject-prefix / faculty
 * code). A flattened text extraction (pdf-parse-style) loses column
 * alignment — adjacent tables' cells interleave in reading order — so this
 * uses pdfjs-dist instead, which reports each text run's page-space (x, y)
 * position, and resolves each of THIS faculty member's cells to a
 * room/batch/time by nearest-position matching against the header/time-label
 * rows. It deliberately does not attempt to reconstruct the full grid for
 * every other teacher on the page — only this one faculty code's cells are
 * ever extracted.
 *
 * This is a best-effort heuristic against a real-world, human-formatted
 * document, not a guaranteed-exact parser — every "couldn't confidently
 * place this cell" case becomes a warning rather than a silent guess, and
 * the caller (jobSchedule.service.js) marks every ingested class
 * needsReview so a human confirms it before it's trusted.
 */

const DATE_RE = /Class Schedule on (\d{2})\.(\d{2})\.(\d{4})/;
const DAY_RE = /^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)$/;
const TIME_RANGE_RE = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/;
const PAREN_TIME_RE = /\((\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\)/;

// Points, not pixels — PDF user-space units at the page's native scale.
// Items within this Y distance are treated as printed on the same visual
// row; this only needs to be smaller than a table's row height.
const ROW_Y_TOLERANCE = 3;
// How close (in x) a standalone "(H:MM-H:MM)" override must sit next to its
// own cell to count as belonging to it, rather than the next cell over.
const PAREN_X_TOLERANCE = 60;

function buildHitRegex(facultyCode) {
  const escaped = String(facultyCode).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^([A-Za-z]+)/${escaped}\\b`);
}

/**
 * Groups text items into visual rows by Y-proximity, each row's items
 * sorted left-to-right by X. Rows are returned top-to-bottom (largest PDF-
 * space Y first, since PDF Y increases upward).
 */
function clusterRows(items) {
  const rows = [];
  for (const item of items) {
    let row = rows.find((r) => Math.abs(r.y - item.y) < ROW_Y_TOLERANCE);
    if (!row) {
      row = { y: item.y, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  }
  rows.forEach((r) => r.items.sort((a, b) => a.x - b.x));
  rows.sort((a, b) => b.y - a.y);
  return rows;
}

function closestByX(candidates, x) {
  if (candidates.length === 0) return null;
  return candidates.reduce((best, c) => (Math.abs(c.x - x) < Math.abs(best.x - x) ? c : best));
}

/**
 * Finds this cell's row/batch/room header value: among rows whose leftmost
 * item is exactly `label` ("BATCHES" or "Room"), picks the one closest
 * ABOVE the cell's own row (smallest Y greater than the cell's Y — i.e. the
 * nearest enclosing mini-table's own header, not some other table's), then
 * within that row picks whichever data cell's X is closest to the hit's X.
 */
function pickHeaderValue(labeledRows, rowY, x) {
  const above = labeledRows.filter((r) => r.y > rowY + ROW_Y_TOLERANCE);
  if (above.length === 0) return null;
  const nearestRow = above.reduce((best, r) => (r.y < best.y ? r : best));
  const dataCells = nearestRow.items.slice(1); // [0] is the "BATCHES"/"Room" label itself
  return closestByX(dataCells, x);
}

async function loadTextItems(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(buffer);
  const pdf = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  return content.items
    .map((it) => ({ text: it.str.trim(), x: it.transform[4], y: it.transform[5] }))
    .filter((it) => it.text.length > 0);
}

export async function extractMyClassesFromPdf(buffer, facultyCode) {
  const items = await loadTextItems(buffer);
  const warnings = [];

  const fullText = items.map((i) => i.text).join(' ');
  const dateMatch = DATE_RE.exec(fullText);
  let date = null;
  if (dateMatch) {
    const [, dd, mm, yyyy] = dateMatch;
    date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  } else {
    warnings.push('Could not find the schedule date ("Class Schedule on DD.MM.YYYY") anywhere on the page.');
  }
  const dayItem = items.find((i) => DAY_RE.test(i.text));
  const dayOfWeek = dayItem ? dayItem.text[0] + dayItem.text.slice(1).toLowerCase() : null;

  const rows = clusterRows(items);
  const batchRows = rows.filter((r) => r.items[0]?.text === 'BATCHES');
  const roomRows = rows.filter((r) => r.items[0]?.text === 'Room');
  const hitRegex = buildHitRegex(facultyCode);

  const classes = [];

  rows.forEach((row) => {
    const timeMatch = TIME_RANGE_RE.exec(row.items[0]?.text || '');

    row.items.forEach((item, idxInRow) => {
      const hit = hitRegex.exec(item.text);
      if (!hit) return;

      let startTime = timeMatch ? timeMatch[1] : null;
      let endTime = timeMatch ? timeMatch[2] : null;

      // A cell's own text, or the very next cell in the same row, may carry
      // a parenthetical override time for a double period (e.g. "Z/MSR
      // (11:40-1:40)") — that always wins over the row's nominal slot.
      const inlineParen = PAREN_TIME_RE.exec(item.text);
      const nextInRow = row.items[idxInRow + 1];
      const nextParen =
        !inlineParen && nextInRow && nextInRow.x - item.x < PAREN_X_TOLERANCE ? PAREN_TIME_RE.exec(nextInRow.text) : null;
      const paren = inlineParen || nextParen;
      if (paren) {
        [, startTime, endTime] = paren;
      }

      const batchItem = pickHeaderValue(batchRows, row.y, item.x);
      const roomItem = pickHeaderValue(roomRows, row.y, item.x);

      if (!startTime) {
        warnings.push(`"${item.text}": couldn't determine a time slot (its row's label wasn't a time range) — skipped.`);
        return;
      }
      if (!batchItem) {
        warnings.push(`"${item.text}" at ${startTime}-${endTime}: couldn't determine the batch — skipped.`);
        return;
      }
      if (!roomItem) {
        warnings.push(`"${item.text}" at ${startTime}-${endTime} (${batchItem.text}): couldn't determine the room.`);
      }

      classes.push({
        startTime,
        endTime,
        room: roomItem ? roomItem.text : '',
        batchCode: batchItem.text,
        subjectPrefix: hit[1],
        rawText: item.text,
      });
    });
  });

  if (classes.length === 0 && warnings.length === 0) {
    warnings.push(`No cells found for faculty code "${facultyCode}" on this page.`);
  }

  return { date, dayOfWeek, classes, warnings };
}
