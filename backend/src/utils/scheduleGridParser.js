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
// Most mini-tables write a slot as "H:MM-H:MM", but at least one observed
// sub-table (an afternoon/evening block) uses periods instead — "4.00-5.00"
// — for the exact same thing. Accept either separator and normalize to a
// colon on capture (see normalizeTimeToken) so storage/downstream parsing
// (jobTime.js) only ever sees "H:MM".
const TIME_TOKEN = '\\d{1,2}[:.]\\d{2}';
// No trailing `$` — a row's own leading time label sometimes arrives fused
// to its first data cell in one PDF text run with no space ("12:15-1:15
// B/SKMS"), rather than as two separate runs like every other cell. Only
// applied to a row's leftmost item, so matching just the time-range prefix
// and ignoring whatever's glued after it is exactly what's wanted here.
const TIME_RANGE_RE = new RegExp(`^(${TIME_TOKEN})\\s*-\\s*(${TIME_TOKEN})`);
const PAREN_TIME_RE = new RegExp(`\\((${TIME_TOKEN})\\s*-\\s*(${TIME_TOKEN})\\)`);
const GENERIC_PAREN_RE = /\(([^)]+)\)/;
const PAREN_LOOKS_LIKE_TIME_RE = new RegExp(`^${TIME_TOKEN}\\s*-\\s*${TIME_TOKEN}$`);

function normalizeTimeToken(token) {
  return token.replace('.', ':');
}

// Aakash writes a cell as "<subject letter>/<faculty code>" — expand the
// letter to the full subject name so "P/AGP" reads as Physics, not "P".
const SUBJECT_BY_PREFIX = {
  P: 'Physics',
  C: 'Chemistry',
  B: 'Biology',
  Z: 'Zoology',
  M: 'Mathematics',
  MAT: 'Mathematics',
  ENG: 'English',
  SST: 'Social Science',
};

export function expandSubject(prefix) {
  return SUBJECT_BY_PREFIX[String(prefix || '').toUpperCase()] || prefix || '';
}

// Points, not pixels — PDF user-space units at the page's native scale.
// Items within this Y distance are treated as printed on the same visual
// row; this only needs to be smaller than a table's row height.
const ROW_Y_TOLERANCE = 3;
// How close (in x) a standalone "(H:MM-H:MM)" override must sit next to its
// own cell to count as belonging to it, rather than the next cell over.
const PAREN_X_TOLERANCE = 60;
// Under a "Doubt" column, the real batch prints as its own text run just
// below the faculty-code cell (e.g. "C/SDC" on one line, "(DRA+E)" printed
// ~16pt directly under it) rather than inline in the same string — a
// same-cell two-line layout, not a same-row neighbour like the time override
// above, so it needs its own (tighter-x, taller-y) search window.
const DOUBT_PAREN_Y_TOLERANCE = 20;
const DOUBT_PAREN_X_TOLERANCE = 15;
// A Doubt column's faculty-code cell sits a few points off the row's own
// time-label baseline (observed ~7.6-7.9pt in a real sample — evidently a
// different vertical alignment inside that one sub-table), enough to land in
// a separate row cluster under ROW_Y_TOLERANCE. This lets such a row borrow
// the time label from the nearest row that has one, still well short of the
// ~40pt+ gap between actual consecutive time slots.
const TIME_ROW_Y_TOLERANCE = 10;

// Optional trailing "_DIS"/"_Disc..." on the faculty-code cell itself marks
// a discussion slot — same thing as a doubt class, per the mentor. Captured
// separately so it can be checked without re-matching; note a plain `\b`
// after the code wouldn't see this suffix at all, since "_" counts as a
// word character and so doesn't create a boundary against the letters
// before it — hence matching the suffix explicitly instead of relying on \b.
function buildHitRegex(facultyCode) {
  const escaped = String(facultyCode).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^([A-Za-z]+)/${escaped}(_[A-Za-z]+)?\\b`);
}

// A header/hit fragment names a doubt/discussion slot when it contains
// "Doubt" (optionally prefixed, e.g. "Doubt_DRA") or a "_DIS"/"_Disc..."
// marker (e.g. "DTYC_DIS") — the mentor uses the two interchangeably.
// Stripping whichever matched leaves the real batch code, if one was
// embedded directly rather than needing the paren-lookup fallback.
const DOUBT_MARKER_RE = /doubt_?|_dis\w*/gi;

function isDoubtMarked(text) {
  return /doubt/i.test(text) || /_dis\w*/i.test(text);
}

function stripDoubtMarker(text) {
  return text.replace(DOUBT_MARKER_RE, '').trim();
}

// A fused header+value PDF text run ("BATCHES DTYB_EX" as one string,
// rather than "BATCHES" and "DTYB_EX" as separate runs — the same kind of
// tight-kerning merge already seen with time labels) leaves the literal
// label glued onto the real value; strip it back off.
function stripLabelPrefix(text, label) {
  return text.replace(new RegExp(`^${label}\\s+`, 'i'), '');
}

// The opposite of a fused cell: a narrow column sometimes line-wraps a
// label exactly at its underscore ("Doubt_DRA" -> "Doubt_" on one line,
// "DRA" on the next, "DTYC_DIS" -> "DTYC_" then "DIS", etc), landing the two
// halves as separate text runs ~16pt apart vertically and roughly aligned
// horizontally — confirmed against several real instances on one page.
// Recombining them before row-clustering means every downstream lookup
// (header resolution, doubt-marker stripping) sees one normal label, same
// as it would if the PDF hadn't wrapped it.
const WRAP_Y_TOLERANCE = 20;
const WRAP_X_TOLERANCE = 25;

function mergeWrappedLabels(items) {
  const consumed = new Set();
  const merged = [];
  for (const item of items) {
    if (consumed.has(item)) continue;
    if (/_$/.test(item.text)) {
      let best = null;
      let bestDist = Infinity;
      for (const other of items) {
        if (other === item || consumed.has(other)) continue;
        const dy = item.y - other.y;
        const dx = Math.abs(other.x - item.x);
        if (dy > 0 && dy <= WRAP_Y_TOLERANCE && dx <= WRAP_X_TOLERANCE && dy + dx < bestDist) {
          bestDist = dy + dx;
          best = other;
        }
      }
      if (best) {
        consumed.add(best);
        merged.push({ text: item.text + best.text, x: item.x, y: item.y });
        continue;
      }
    }
    merged.push(item);
  }
  return merged;
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

/**
 * Falls back to the nearest OTHER row's time-range label when a row's own
 * leftmost item isn't one — see TIME_ROW_Y_TOLERANCE.
 */
function findNearbyTimeRange(rows, y) {
  let best = null;
  let bestDist = Infinity;
  for (const r of rows) {
    const m = TIME_RANGE_RE.exec(r.items[0]?.text || '');
    if (!m) continue;
    const dist = Math.abs(r.y - y);
    if (dist <= TIME_ROW_Y_TOLERANCE && dist < bestDist) {
      bestDist = dist;
      best = m;
    }
  }
  return best;
}

function closestByX(candidates, x) {
  if (candidates.length === 0) return null;
  return candidates.reduce((best, c) => (Math.abs(c.x - x) < Math.abs(best.x - x) ? c : best));
}

/**
 * Under a "Doubt" column, finds the real batch code printed just below the
 * hit cell — the closest (by x, then y) parenthetical text run on a row
 * beneath it that doesn't itself look like a time range (a time-override
 * paren belongs to a different, non-Doubt cell shape and is handled
 * separately above).
 */
function findDoubtActualBatch(rows, hitY, hitX) {
  let best = null;
  let bestDist = Infinity;
  for (const row of rows) {
    if (row.y >= hitY || hitY - row.y > DOUBT_PAREN_Y_TOLERANCE) continue;
    for (const it of row.items) {
      const xDist = Math.abs(it.x - hitX);
      if (xDist > DOUBT_PAREN_X_TOLERANCE) continue;
      const m = GENERIC_PAREN_RE.exec(it.text);
      if (!m || PAREN_LOOKS_LIKE_TIME_RE.test(m[1].trim())) continue;
      const dist = xDist + (hitY - row.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = m[1].trim();
      }
    }
  }
  return best;
}

// A header row occasionally has one of its own cells line-wrapped just far
// enough off its baseline (~8pt observed) to land in its own separate row
// cluster instead of the "official" one (whose leftmost cell is literally
// "BATCHES"/"Room") — mergeWrappedLabels fixes the split text itself, but
// the merged result still needs to be found. Rows this close to the
// official header row are treated as extra cells of it.
const HEADER_ROW_Y_SPREAD = 10;

/**
 * Finds this cell's row/batch/room header value: among rows CONTAINING the
 * label ("BATCHES" or "Room") somewhere in them, picks the one closest
 * ABOVE the cell's own row (smallest Y greater than the cell's Y — i.e. the
 * nearest enclosing mini-table's own header, not some other table's), then
 * within that row (plus any row within HEADER_ROW_Y_SPREAD of it) picks
 * whichever data cell's X is closest to the hit's X. Checks for the label
 * ANYWHERE in the row rather than assuming it's the leftmost item — a
 * vertical page label (e.g. the "MONDAY" running down the left margin) can
 * land at the same Y as a header row and sort before it by X, which would
 * otherwise hide that entire header row from every hit that needs it.
 */
function pickHeaderValue(labeledRows, allRows, rowY, x, label) {
  const above = labeledRows.filter((r) => r.y > rowY + ROW_Y_TOLERANCE);
  if (above.length === 0) return null;
  const nearestRow = above.reduce((best, r) => (r.y < best.y ? r : best));
  const nearbyRows = allRows.filter((r) => r !== nearestRow && Math.abs(r.y - nearestRow.y) <= HEADER_ROW_Y_SPREAD);
  const dataCells = [nearestRow, ...nearbyRows].flatMap((r) => r.items).filter((it) => it.text !== label);
  return closestByX(dataCells, x);
}

/**
 * A page-wide row of mini-tables laid out side by side can carry several
 * "H:MM-H:MM" labels at the same Y — one per table sharing that row height
 * — not just one. A hit's own time label is the nearest such label to its
 * LEFT in the row: each mini-table's label sits at its own left edge, so
 * this picks up the hit's own table's label rather than some unrelated
 * table's that happens to share this Y-band.
 */
function findRowTimeMatch(row, x) {
  const labels = row.items
    .map((it) => ({ x: it.x, m: TIME_RANGE_RE.exec(it.text) }))
    .filter((t) => t.m && t.x <= x);
  if (labels.length === 0) return null;
  return labels.reduce((best, t) => (t.x > best.x ? t : best)).m;
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
  const items = mergeWrappedLabels(await loadTextItems(buffer));
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
  const batchRows = rows.filter((r) => r.items.some((it) => it.text === 'BATCHES'));
  const roomRows = rows.filter((r) => r.items.some((it) => it.text === 'Room'));
  const hitRegex = buildHitRegex(facultyCode);

  const classes = [];

  rows.forEach((row) => {
    row.items.forEach((item, idxInRow) => {
      const hit = hitRegex.exec(item.text);
      if (!hit) return;

      const timeMatch = findRowTimeMatch(row, item.x) || findNearbyTimeRange(rows, row.y);
      let startTime = timeMatch ? normalizeTimeToken(timeMatch[1]) : null;
      let endTime = timeMatch ? normalizeTimeToken(timeMatch[2]) : null;

      // A cell's own text, or the very next cell in the same row, may carry
      // a parenthetical override time for a double period (e.g. "Z/MSR
      // (11:40-1:40)") — that always wins over the row's nominal slot.
      const inlineParen = PAREN_TIME_RE.exec(item.text);
      const nextInRow = row.items[idxInRow + 1];
      const nextParen =
        !inlineParen && nextInRow && nextInRow.x - item.x < PAREN_X_TOLERANCE ? PAREN_TIME_RE.exec(nextInRow.text) : null;
      const paren = inlineParen || nextParen;
      if (paren) {
        startTime = normalizeTimeToken(paren[1]);
        endTime = normalizeTimeToken(paren[2]);
      }

      const batchItem = pickHeaderValue(batchRows, rows, row.y, item.x, 'BATCHES');
      const roomItem = pickHeaderValue(roomRows, rows, row.y, item.x, 'Room');

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

      // A header naming "Doubt"/"Doubt_<batch>"/"<batch>_DIS" means this
      // slot is a doubt-clearing/discussion session, not a regular class —
      // when the real batch is embedded right in the header text (anything
      // other than the bare word "Doubt" once the marker is stripped), use
      // that directly; otherwise it's printed just below the faculty code
      // as its own line (e.g. "P/AGP" then "(DRC)" directly under it).
      let batchCode = stripLabelPrefix(batchItem.text, 'BATCHES');
      let isDoubt = false;
      if (isDoubtMarked(batchCode)) {
        isDoubt = true;
        const embedded = stripDoubtMarker(batchCode);
        if (embedded) {
          batchCode = embedded;
        } else {
          const actual = findDoubtActualBatch(rows, row.y, item.x);
          if (actual) {
            batchCode = actual;
          } else {
            warnings.push(`"${item.text}" at ${startTime}-${endTime}: a doubt-class cell but couldn't find the actual batch printed beneath it — kept as "Doubt".`);
          }
        }
      }

      // The hit cell itself can carry the same "_DIS" marker (e.g.
      // "P/AGP_DIS") rather than the column being a doubt column — the
      // column's own batch is already correct in that case, only the
      // doubt/discussion flag needs setting.
      if (hit[2] && /^_dis/i.test(hit[2])) {
        isDoubt = true;
      }

      classes.push({
        startTime,
        endTime,
        room: roomItem ? stripLabelPrefix(roomItem.text, 'Room') : '',
        batchCode,
        subjectPrefix: expandSubject(hit[1]),
        rawText: item.text,
        isDoubt,
      });
    });
  });

  if (classes.length === 0 && warnings.length === 0) {
    warnings.push(`No cells found for faculty code "${facultyCode}" on this page.`);
  }

  return { date, dayOfWeek, classes, warnings };
}
