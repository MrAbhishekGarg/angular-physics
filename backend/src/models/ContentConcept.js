import mongoose from 'mongoose';

/**
 * Content planning module — admin-only. Tracks a single teaching *concept*
 * and every piece of content derived from it across both platforms (e.g.
 * one concept might spawn 1-2 long videos, a short, a carousel, and a
 * community post, each progressing through its own pipeline independently).
 *
 * This absorbed the older, separate "YouTube video tracker" module — each
 * piece now carries its own reference id plus the source/PYQ fields that
 * tracker used to have, so nothing was lost in the merge (see
 * scripts/migrateVideoTrackerToContentPlanner.js for the one-time move of
 * its existing data).
 */
const PLATFORMS = ['youtube', 'instagram', 'whatsapp', 'telegram'];
const PIECE_TYPES = ['long-video', 'short', 'carousel', 'community-post', 'poll-question'];
const PIECE_STATUSES = ['planned', 'scripted', 'recorded', 'edited', 'uploaded', 'scheduled', 'published'];

const contentPieceSchema = new mongoose.Schema(
  {
    // Human-readable reference id, unique across every piece of every
    // concept — e.g. "YT-LV-METACENTER-0007" (YouTube Long Video). See
    // contentPlanner.service.js#buildPieceId.
    pieceId: { type: String, required: true },
    platform: { type: String, enum: PLATFORMS, required: true },
    type: { type: String, enum: PIECE_TYPES, required: true },
    // Free label so more than one piece of the same type can coexist under
    // one concept (e.g. "Long Video 1" / "Long Video 2") — not enforced
    // unique, purely descriptive.
    label: { type: String, default: '' },
    status: { type: String, enum: PIECE_STATUSES, default: 'planned' },
    // A separate flag rather than a PIECE_STATUSES value on purpose: "on
    // hold" isn't a pipeline stage, it's a basket for reserving a piece for
    // later regardless of how far it got — status still tracks the real
    // stage underneath (recorded/edited/whatever it actually reached) so
    // taking it off hold resumes exactly where it left off instead of
    // losing that progress.
    onHold: { type: Boolean, default: false },
    // Carried over from the old video tracker — a piece can be "about" a
    // specific PYQ problem rather than pure concept teaching.
    source: { type: String, default: '', trim: true },
    isPYQ: { type: Boolean, default: false },
    pyqYear: { type: Number, default: null },
    // Only meaningful once status is "scheduled" — when the upload is set to
    // go live on the platform.
    scheduledFor: { type: Date, default: null },
    // When this piece actually went live — set automatically the moment
    // status first becomes "published" (see updatePieceStatus), editable by
    // hand afterward for backdating/correction the same way scheduledFor is.
    publishedAt: { type: Date, default: null },
    link: { type: String, default: '', trim: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

const contentConceptSchema = new mongoose.Schema(
  {
    conceptId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    chapter: { type: String, default: '', trim: true },
    topic: { type: String, default: '', trim: true },
    notes: { type: String, default: '' },
    pieces: { type: [contentPieceSchema], default: [] },
    createdByName: { type: String, default: '' },
  },
  { timestamps: true }
);

// Multikey index — Mongo enforces this uniquely across every piece in every
// document in the collection, not just within one concept's array.
contentConceptSchema.index({ 'pieces.pieceId': 1 }, { unique: true });

export { PLATFORMS, PIECE_TYPES, PIECE_STATUSES };
export default mongoose.models.ContentConcept || mongoose.model('ContentConcept', contentConceptSchema);
