import { createSheetRowSync } from '../utils/sheetsRowSync.js';
import { env } from '../config/env.js';

const HEADER = [
  'Piece ID', 'Concept ID', 'Concept Title', 'Chapter', 'Topic', 'Platform', 'Type', 'Label',
  'Status', 'On Hold', 'Scheduled For', 'Published At', 'Source', 'PYQ', 'PYQ Year', 'Link', 'Notes', 'Created At', 'Updated At',
];

/** One row per content piece — a piece is the actual unit of "a post", the concept is just its grouping. */
function rowFromPiece({ concept, piece }) {
  return [
    piece.pieceId,
    concept.conceptId,
    concept.title,
    concept.chapter || '',
    concept.topic || '',
    piece.platform,
    piece.type,
    piece.label || '',
    piece.status,
    piece.onHold ? 'Yes' : 'No',
    piece.scheduledFor ? new Date(piece.scheduledFor).toISOString() : '',
    piece.publishedAt ? new Date(piece.publishedAt).toISOString() : '',
    piece.source || '',
    piece.isPYQ ? 'Yes' : 'No',
    piece.pyqYear || '',
    piece.link || '',
    piece.notes || '',
    piece.createdAt ? new Date(piece.createdAt).toISOString() : '',
    piece.updatedAt ? new Date(piece.updatedAt).toISOString() : '',
  ];
}

const sync = createSheetRowSync({
  sheetName: env.contentPlannerSheetName,
  header: HEADER,
  rowFromEntity: rowFromPiece,
  idOf: ({ piece }) => piece.pieceId,
});

/** Syncs every piece of one concept (used after any create/update touching the concept-level columns). */
export async function syncConceptPieces(concept) {
  await Promise.all(concept.pieces.map((piece) => sync.upsertRow({ concept, piece })));
}

export async function syncPiece(concept, piece) {
  await sync.upsertRow({ concept, piece });
}

export async function deletePieceRow(pieceId) {
  await sync.deleteRow(pieceId);
}

export async function deleteConceptRows(concept) {
  await Promise.all(concept.pieces.map((piece) => sync.deleteRow(piece.pieceId)));
}

export async function resyncAllPieces(concepts) {
  const entities = concepts.flatMap((concept) => concept.pieces.map((piece) => ({ concept, piece })));
  return sync.resyncAll(entities);
}
