import { sheets, isGoogleSheetsConfigured } from '../config/googleSheets.js';
import { env } from '../config/env.js';

/**
 * Factory for "one row per entity, upserted by its own reference id, in its
 * own tab" Google Sheets sync — the exact shape every admin-only tracker in
 * this app needs (previously duplicated for the YouTube video tracker;
 * generalized here once that module merged into the content planner, since
 * a second near-identical copy would just be duplication).
 *
 * @param {object} opts
 * @param {string} opts.sheetName - tab name, created automatically if missing
 * @param {string[]} opts.header - column headers, in order
 * @param {(entity: object) => any[]} opts.rowFromEntity - builds one row's cell values from an entity
 * @param {(entity: object) => string} opts.idOf - the entity's unique reference id (goes in column A)
 */
export function createSheetRowSync({ sheetName, header, rowFromEntity, idOf }) {
  const lastColumnLetter = String.fromCharCode(65 + header.length - 1); // e.g. 15 columns -> 'O'
  let headerEnsured = false;
  let cachedSheetId = null;

  async function ensureTabAndHeader() {
    if (headerEnsured) return;
    const spreadsheetId = env.googleSheetsSpreadsheetId;
    const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
    const match = meta.data.sheets.find((s) => s.properties.title === sheetName);

    if (!match) {
      const created = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
      });
      cachedSheetId = created.data.replies[0].addSheet.properties.sheetId;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [header] },
      });
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: { sheetId: cachedSheetId, startRowIndex: 0, endRowIndex: 1 },
                cell: { userEnteredFormat: { textFormat: { bold: true } } },
                fields: 'userEnteredFormat.textFormat.bold',
              },
            },
            {
              updateSheetProperties: {
                properties: { sheetId: cachedSheetId, gridProperties: { frozenRowCount: 1 } },
                fields: 'gridProperties.frozenRowCount',
              },
            },
          ],
        },
      });
    } else {
      cachedSheetId = match.properties.sheetId;
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A1:${lastColumnLetter}1` });
      const existing = res.data.values?.[0];
      if (!existing || existing.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [header] },
        });
      }
    }
    headerEnsured = true;
  }

  /** 1-based row number of the entity's row, or null if not found. Row 1 is the header. */
  async function findRowNumber(id) {
    const spreadsheetId = env.googleSheetsSpreadsheetId;
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A:A` });
    const column = res.data.values || [];
    const index = column.findIndex((row, i) => i > 0 && row[0] === id);
    return index === -1 ? null : index + 1;
  }

  async function getNumericSheetId() {
    if (cachedSheetId !== null) return cachedSheetId;
    const spreadsheetId = env.googleSheetsSpreadsheetId;
    const res = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
    const match = res.data.sheets.find((s) => s.properties.title === sheetName);
    cachedSheetId = match ? match.properties.sheetId : null;
    return cachedSheetId;
  }

  async function upsertRow(entity) {
    if (!isGoogleSheetsConfigured()) return;
    try {
      const spreadsheetId = env.googleSheetsSpreadsheetId;
      await ensureTabAndHeader();
      const id = idOf(entity);
      const rowNumber = await findRowNumber(id);
      const values = [rowFromEntity(entity)];
      if (rowNumber) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A${rowNumber}:${lastColumnLetter}${rowNumber}`,
          valueInputOption: 'RAW',
          requestBody: { values },
        });
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values },
        });
      }
    } catch (err) {
      // Never let a Sheets outage/misconfiguration break the app itself —
      // the database row is always the source of truth; the sheet is a
      // best-effort mirror.
      console.error(`[sheetsRowSync:${sheetName}] Failed to sync row:`, err.message);
    }
  }

  async function deleteRow(id) {
    if (!isGoogleSheetsConfigured()) return;
    try {
      const spreadsheetId = env.googleSheetsSpreadsheetId;
      const [rowNumber, sheetId] = await Promise.all([findRowNumber(id), getNumericSheetId()]);
      if (!rowNumber || sheetId === null) return;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber } } }],
        },
      });
    } catch (err) {
      console.error(`[sheetsRowSync:${sheetName}] Failed to delete row:`, err.message);
    }
  }

  /** Pushes every given entity into the sheet, sequentially (stays under Sheets' write-rate limit). */
  async function resyncAll(entities) {
    for (const entity of entities) {
      // eslint-disable-next-line no-await-in-loop
      await upsertRow(entity);
    }
    return { synced: entities.length };
  }

  return { upsertRow, deleteRow, resyncAll };
}
