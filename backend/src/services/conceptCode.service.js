import ConceptCode from '../models/ConceptCode.js';
import { ApiError } from '../utils/ApiError.js';
import { parseConceptCodesFromExcelBuffer } from '../utils/conceptCodesExcelParser.js';

export async function getAllConceptCodes() {
  return ConceptCode.find().sort({ code: 1 }).lean();
}

export async function createConceptCode(payload) {
  try {
    const doc = await ConceptCode.create(payload);
    return doc.toObject();
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, `Concept code "${payload.code}" already exists`);
    throw err;
  }
}

export async function updateConceptCode(id, payload) {
  try {
    const doc = await ConceptCode.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean();
    if (!doc) throw new ApiError(404, 'Concept code not found');
    return doc;
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, `Concept code "${payload.code}" already exists`);
    throw err;
  }
}

export async function deleteConceptCode(id) {
  const doc = await ConceptCode.findByIdAndDelete(id).lean();
  if (!doc) throw new ApiError(404, 'Concept code not found');
  return doc;
}

/** Map<code, {chapter, topic}>, used by the bulk-upload parser. */
export async function getConceptCodeMap() {
  const codes = await ConceptCode.find().lean();
  return new Map(codes.map((c) => [c.code, { chapter: c.chapter, topic: c.topic }]));
}

/**
 * Bulk-loads Concept Codes from an uploaded Excel workbook — upserts by
 * `code` (the schema's unique key) rather than rejecting on duplicates, so
 * re-uploading an updated sheet safely edits existing codes instead of
 * erroring out row-by-row like createConceptCode does for a single entry.
 */
export async function bulkUpsertFromExcel(buffer) {
  const { rows, warnings } = await parseConceptCodesFromExcelBuffer(buffer);
  const allWarnings = [...warnings];

  let created = 0;
  let updated = 0;
  for (const row of rows) {
    try {
      const result = await ConceptCode.findOneAndUpdate(
        { code: row.code },
        { $set: { label: row.label, chapter: row.chapter, topic: row.topic } },
        { upsert: true, new: true, runValidators: true, includeResultMetadata: true }
      );
      if (result.lastErrorObject?.upserted) created += 1;
      else updated += 1;
    } catch (err) {
      allWarnings.push(`Code "${row.code}": ${err.message}`);
    }
  }

  return { created, updated, warnings: allWarnings };
}
