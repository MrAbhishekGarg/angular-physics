import ExcelJS from 'exceljs';
import ContentConcept, { PLATFORMS, PIECE_TYPES, PIECE_STATUSES } from '../models/ContentConcept.js';
import { getNextSequence } from '../utils/sequence.js';
import { ApiError } from '../utils/ApiError.js';
import { syncConceptPieces, syncPiece, deletePieceRow, deleteConceptRows, resyncAllPieces } from './contentPlannerSheetsSync.service.js';

const PLATFORM_CODE = { youtube: 'YT', instagram: 'IG', whatsapp: 'WA', telegram: 'TG' };
const TYPE_CODE = { 'long-video': 'LV', short: 'SH', carousel: 'CA', 'community-post': 'CP', 'poll-question': 'PQ' };

/** Collapses a string into an uppercase, punctuation-free slug for an id. */
function slugify(text) {
  const slug = String(text || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 16);
  return slug || 'GENERAL';
}

async function buildConceptId(title) {
  const seq = await getNextSequence('content-concept');
  return `CP-${slugify(title)}-${String(seq).padStart(4, '0')}`;
}

/**
 * Every content piece — the actual unit of "a post" — gets its own
 * reference id, independent of its concept's id. This is what used to be
 * the YouTube video tracker's whole job; that module was folded in here
 * once pieces could carry it themselves (see
 * scripts/migrateVideoTrackerToContentPlanner.js for the one-time move of
 * its existing data).
 */
async function buildPieceId({ platform, type, slugSource }) {
  const seq = await getNextSequence('content-piece');
  return `${PLATFORM_CODE[platform]}-${TYPE_CODE[type]}-${slugify(slugSource)}-${String(seq).padStart(4, '0')}`;
}

function validatePiece({ platform, type }) {
  if (!PLATFORMS.includes(platform)) throw new ApiError(400, `platform must be one of: ${PLATFORMS.join(', ')}`);
  if (!PIECE_TYPES.includes(type)) throw new ApiError(400, `type must be one of: ${PIECE_TYPES.join(', ')}`);
}

/**
 * The "minimum effort" quick-add bundle described by the request: for one
 * concept, 1-2 long videos plus whichever of short/carousel/community-post/
 * poll-question the mentor wants — built from simple flags rather than the
 * caller having to spell out each piece by hand. Every item's platforms is
 * an array (tick any combination — YouTube, Instagram, WhatsApp, Telegram),
 * not just a single choice, since e.g. a mentor commonly wants the same
 * short cut for both YouTube and Instagram at once. `shared`
 * (source/isPYQ/pyqYear) applies to every piece in the bundle, since a
 * bundle is usually all about the same underlying question/source.
 */
async function bundleFromFlags(
  {
    longVideoCount,
    longVideoPlatforms,
    includeShort,
    shortPlatforms,
    includeCarousel,
    carouselPlatforms,
    includeCommunityPost,
    communityPostPlatforms,
    includePollQuestion,
    pollQuestionPlatforms,
  },
  slugSource,
  shared = {}
) {
  const specs = [];
  const platformsOrDefault = (value, fallback) => (Array.isArray(value) && value.length > 0 ? value : [fallback]);

  const count = Math.min(2, Math.max(0, Number(longVideoCount) || 0));
  if (count > 0) {
    platformsOrDefault(longVideoPlatforms, 'youtube').forEach((platform) => {
      for (let i = 1; i <= count; i += 1) {
        specs.push({ platform, type: 'long-video', label: count > 1 ? `Long Video ${i}` : 'Long Video' });
      }
    });
  }
  if (includeShort) {
    platformsOrDefault(shortPlatforms, 'youtube').forEach((platform) => specs.push({ platform, type: 'short', label: 'Short' }));
  }
  if (includeCarousel) {
    platformsOrDefault(carouselPlatforms, 'instagram').forEach((platform) => specs.push({ platform, type: 'carousel', label: 'Carousel' }));
  }
  if (includeCommunityPost) {
    platformsOrDefault(communityPostPlatforms, 'youtube').forEach((platform) =>
      specs.push({ platform, type: 'community-post', label: 'Community Post' })
    );
  }
  if (includePollQuestion) {
    platformsOrDefault(pollQuestionPlatforms, 'telegram').forEach((platform) =>
      specs.push({ platform, type: 'poll-question', label: 'Poll Question' })
    );
  }

  const pieces = [];
  for (const spec of specs) {
    // eslint-disable-next-line no-await-in-loop
    const pieceId = await buildPieceId({ platform: spec.platform, type: spec.type, slugSource });
    pieces.push({
      pieceId,
      ...spec,
      source: shared.source || '',
      isPYQ: Boolean(shared.isPYQ),
      pyqYear: shared.isPYQ ? shared.pyqYear || null : null,
    });
  }
  return pieces;
}

export async function createConcept(payload, createdByName) {
  const { title, chapter, topic, notes, bundle, source, isPYQ, pyqYear } = payload;
  if (!title || !title.trim()) throw new ApiError(400, 'title is required');

  const conceptId = await buildConceptId(title);
  const pieces = bundle ? await bundleFromFlags(bundle, topic || chapter || title, { source, isPYQ, pyqYear }) : [];

  const concept = await ContentConcept.create({
    conceptId,
    title: title.trim(),
    chapter: chapter || '',
    topic: topic || '',
    notes: notes || '',
    pieces,
    createdByName: createdByName || '',
  });
  const plain = concept.toObject();
  await syncConceptPieces(plain);
  return plain;
}

export async function listConcepts({ status, platform, type, search } = {}) {
  const filter = {};
  // "on-hold" is a basket (see ContentConcept.js's onHold field), not a
  // PIECE_STATUSES value — filtering by it means the flag, not the stage.
  if (status === 'on-hold') filter['pieces.onHold'] = true;
  else if (status) filter['pieces.status'] = status;
  if (platform) filter['pieces.platform'] = platform;
  if (type) filter['pieces.type'] = type;
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ conceptId: re }, { title: re }, { chapter: re }, { topic: re }];
  }
  return ContentConcept.find(filter).sort({ createdAt: -1 }).lean();
}

export async function updateConcept(conceptId, payload) {
  const { title, chapter, topic, notes } = payload;
  const update = {};
  if (title !== undefined) update.title = title;
  if (chapter !== undefined) update.chapter = chapter;
  if (topic !== undefined) update.topic = topic;
  if (notes !== undefined) update.notes = notes;
  const concept = await ContentConcept.findOneAndUpdate({ conceptId }, update, { new: true, runValidators: true }).lean();
  if (!concept) throw new ApiError(404, 'Concept not found');
  // Concept-level fields (title/chapter/topic) are duplicated onto every
  // piece's sheet row, so a concept edit has to re-sync all of them.
  await syncConceptPieces(concept);
  return concept;
}

export async function deleteConcept(conceptId) {
  const concept = await ContentConcept.findOneAndDelete({ conceptId }).lean();
  if (!concept) throw new ApiError(404, 'Concept not found');
  await deleteConceptRows(concept);
  return concept;
}

export async function addPiece(conceptId, pieceData) {
  validatePiece(pieceData);
  const { platform, type, label, link, notes, source, isPYQ, pyqYear } = pieceData;

  const existing = await ContentConcept.findOne({ conceptId }).lean();
  if (!existing) throw new ApiError(404, 'Concept not found');

  const pieceId = await buildPieceId({ platform, type, slugSource: existing.topic || existing.chapter || existing.title });
  const newPiece = {
    pieceId,
    platform,
    type,
    label: label || '',
    link: link || '',
    notes: notes || '',
    source: source || '',
    isPYQ: Boolean(isPYQ),
    pyqYear: isPYQ ? pyqYear || null : null,
  };

  const concept = await ContentConcept.findOneAndUpdate(
    { conceptId },
    { $push: { pieces: newPiece } },
    { new: true, runValidators: true }
  ).lean();
  if (!concept) throw new ApiError(404, 'Concept not found');

  const added = concept.pieces.find((p) => p.pieceId === pieceId);
  await syncPiece(concept, added);
  return concept;
}

export async function updatePieceStatus(conceptId, pieceId, status, onHold = false) {
  if (!PIECE_STATUSES.includes(status)) throw new ApiError(400, `status must be one of: ${PIECE_STATUSES.join(', ')}`);
  const set = { 'pieces.$.status': status, 'pieces.$.onHold': Boolean(onHold) };
  // Stamped the moment a piece first goes live — re-set every time it lands
  // on "published" (not just the first) so re-publishing after a revision
  // reflects the latest go-live moment rather than the original one.
  if (status === 'published') set['pieces.$.publishedAt'] = new Date();
  const concept = await ContentConcept.findOneAndUpdate(
    { conceptId, 'pieces._id': pieceId },
    { $set: set },
    { new: true }
  ).lean();
  if (!concept) throw new ApiError(404, 'Concept or content piece not found');
  const piece = concept.pieces.find((p) => String(p._id) === String(pieceId));
  if (piece) await syncPiece(concept, piece);
  return concept;
}

export async function updatePiece(conceptId, pieceId, payload) {
  const { label, link, notes, source, isPYQ, pyqYear, scheduledFor, publishedAt } = payload;
  const set = {};
  if (label !== undefined) set['pieces.$.label'] = label;
  if (link !== undefined) set['pieces.$.link'] = link;
  if (notes !== undefined) set['pieces.$.notes'] = notes;
  if (source !== undefined) set['pieces.$.source'] = source;
  if (isPYQ !== undefined) set['pieces.$.isPYQ'] = Boolean(isPYQ);
  if (pyqYear !== undefined) set['pieces.$.pyqYear'] = isPYQ ? pyqYear || null : null;
  if (scheduledFor !== undefined) set['pieces.$.scheduledFor'] = scheduledFor || null;
  if (publishedAt !== undefined) set['pieces.$.publishedAt'] = publishedAt || null;
  const concept = await ContentConcept.findOneAndUpdate({ conceptId, 'pieces._id': pieceId }, { $set: set }, { new: true, runValidators: true }).lean();
  if (!concept) throw new ApiError(404, 'Concept or content piece not found');
  const piece = concept.pieces.find((p) => String(p._id) === String(pieceId));
  if (piece) await syncPiece(concept, piece);
  return concept;
}

export async function removePiece(conceptId, pieceId) {
  const before = await ContentConcept.findOne({ conceptId }).lean();
  if (!before) throw new ApiError(404, 'Concept not found');
  const removed = before.pieces.find((p) => String(p._id) === String(pieceId));

  const concept = await ContentConcept.findOneAndUpdate({ conceptId }, { $pull: { pieces: { _id: pieceId } } }, { new: true }).lean();
  if (!concept) throw new ApiError(404, 'Concept not found');
  if (removed) await deletePieceRow(removed.pieceId);
  return concept;
}

/** Distinct chapter/topic used on past concepts — same "grows itself" pattern the old video tracker had. */
export async function getUsedTopics() {
  const [chapters, topics] = await Promise.all([
    ContentConcept.distinct('chapter', { chapter: { $ne: '' } }),
    ContentConcept.distinct('topic', { topic: { $ne: '' } }),
  ]);
  return { chapters: chapters.sort(), topics: topics.sort() };
}

/**
 * Aggregates across every piece of every concept (not concepts themselves)
 * — "how much content needs editing, how much needs uploading" is a
 * piece-level question, since one concept's pieces can each be at a
 * different stage.
 */
export async function getStats() {
  const [statusRows, platformRows, typeRows, onHoldRows] = await Promise.all([
    ContentConcept.aggregate([{ $unwind: '$pieces' }, { $group: { _id: '$pieces.status', count: { $sum: 1 } } }]),
    ContentConcept.aggregate([{ $unwind: '$pieces' }, { $group: { _id: '$pieces.platform', count: { $sum: 1 } } }]),
    ContentConcept.aggregate([{ $unwind: '$pieces' }, { $group: { _id: '$pieces.type', count: { $sum: 1 } } }]),
    ContentConcept.aggregate([{ $unwind: '$pieces' }, { $match: { 'pieces.onHold': true } }, { $count: 'count' }]),
  ]);
  const counts = PIECE_STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
  statusRows.forEach((r) => {
    counts[r._id] = r.count;
  });
  // "on-hold" isn't a real status (see onHold field on the piece schema) but
  // the board/report still key off STATUS_META['on-hold'] for display, so
  // it's reported here as its own count alongside the real pipeline stages.
  counts['on-hold'] = onHoldRows[0]?.count || 0;
  const byPlatform = PLATFORMS.reduce((acc, p) => ({ ...acc, [p]: 0 }), {});
  platformRows.forEach((r) => {
    byPlatform[r._id] = r.count;
  });
  const byType = PIECE_TYPES.reduce((acc, t) => ({ ...acc, [t]: 0 }), {});
  typeRows.forEach((r) => {
    byType[r._id] = r.count;
  });
  const totalPieces = PIECE_STATUSES.reduce((sum, s) => sum + counts[s], 0);
  const totalConcepts = await ContentConcept.countDocuments();
  return { counts, byPlatform, byType, totalPieces, totalConcepts };
}

/**
 * Flat, one-row-per-piece view across every concept — the drill-down table
 * behind stat cards/chart slices (e.g. "recorded but not edited", "carousels
 * still planned"). listConcepts() intentionally keeps pieces nested under
 * their concept for the card UI; this is the same data reshaped for a report.
 */
export async function listPiecesFlat({ status, platform, type, search } = {}) {
  const match = {};
  const isOnHoldFilter = status === 'on-hold';
  if (isOnHoldFilter) match['pieces.onHold'] = true;
  else if (status) match['pieces.status'] = status;
  if (platform) match['pieces.platform'] = platform;
  if (type) match['pieces.type'] = type;
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [{ conceptId: re }, { title: re }, { chapter: re }, { topic: re }, { 'pieces.pieceId': re }, { 'pieces.label': re }];
  }

  const concepts = await ContentConcept.find(match).sort({ createdAt: -1 }).lean();
  const rows = [];
  concepts.forEach((concept) => {
    concept.pieces.forEach((piece) => {
      if (isOnHoldFilter && !piece.onHold) return;
      if (!isOnHoldFilter && status && piece.status !== status) return;
      if (platform && piece.platform !== platform) return;
      if (type && piece.type !== type) return;
      rows.push({
        _id: piece._id,
        pieceId: piece.pieceId,
        conceptId: concept.conceptId,
        conceptTitle: concept.title,
        chapter: concept.chapter || '',
        topic: concept.topic || '',
        platform: piece.platform,
        type: piece.type,
        label: piece.label || '',
        status: piece.status,
        onHold: Boolean(piece.onHold),
        source: piece.source || '',
        isPYQ: piece.isPYQ,
        pyqYear: piece.pyqYear || null,
        scheduledFor: piece.scheduledFor || null,
        publishedAt: piece.publishedAt || null,
        link: piece.link || '',
        notes: piece.notes || '',
        createdAt: piece.createdAt,
        updatedAt: piece.updatedAt,
      });
    });
  });
  rows.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return rows;
}

/** Pushes every existing piece into the Google Sheet — for pieces created/edited while sync wasn't reachable. */
export async function resyncAllToSheet() {
  const concepts = await ContentConcept.find().sort({ createdAt: 1 }).lean();
  return resyncAllPieces(concepts);
}

/** One-off .xlsx snapshot of every concept/piece, built fresh on each request — not the Google Sheet, just a plain download. */
export async function exportToExcelBuffer() {
  const concepts = await ContentConcept.find().sort({ createdAt: 1 }).lean();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Content Pieces');
  sheet.columns = [
    { header: 'Piece ID', key: 'pieceId', width: 26 },
    { header: 'Concept ID', key: 'conceptId', width: 22 },
    { header: 'Concept Title', key: 'conceptTitle', width: 32 },
    { header: 'Chapter', key: 'chapter', width: 24 },
    { header: 'Topic', key: 'topic', width: 22 },
    { header: 'Platform', key: 'platform', width: 12 },
    { header: 'Type', key: 'type', width: 16 },
    { header: 'Label', key: 'label', width: 18 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'On Hold', key: 'onHold', width: 10 },
    { header: 'Scheduled For', key: 'scheduledFor', width: 20 },
    { header: 'Published At', key: 'publishedAt', width: 20 },
    { header: 'Source', key: 'source', width: 18 },
    { header: 'PYQ', key: 'pyq', width: 8 },
    { header: 'PYQ Year', key: 'pyqYear', width: 10 },
    { header: 'Link', key: 'link', width: 30 },
    { header: 'Notes', key: 'notes', width: 30 },
    { header: 'Created At', key: 'createdAt', width: 22 },
    { header: 'Updated At', key: 'updatedAt', width: 22 },
  ];
  sheet.getRow(1).font = { bold: true };

  concepts.forEach((concept) => {
    concept.pieces.forEach((piece) => {
      sheet.addRow({
        pieceId: piece.pieceId,
        conceptId: concept.conceptId,
        conceptTitle: concept.title,
        chapter: concept.chapter || '',
        topic: concept.topic || '',
        platform: piece.platform,
        type: piece.type,
        label: piece.label || '',
        status: piece.status,
        onHold: piece.onHold ? 'Yes' : 'No',
        scheduledFor: piece.scheduledFor ? new Date(piece.scheduledFor).toISOString() : '',
        publishedAt: piece.publishedAt ? new Date(piece.publishedAt).toISOString() : '',
        source: piece.source || '',
        pyq: piece.isPYQ ? 'Yes' : 'No',
        pyqYear: piece.pyqYear || '',
        link: piece.link || '',
        notes: piece.notes || '',
        createdAt: piece.createdAt ? new Date(piece.createdAt).toISOString() : '',
        updatedAt: piece.updatedAt ? new Date(piece.updatedAt).toISOString() : '',
      });
    });
  });

  return workbook.xlsx.writeBuffer();
}
