/**
 * One-time backfill: assigns a pieceId to any content piece that predates
 * that field (created before this feature existed). Safe to re-run — only
 * touches pieces with a missing/undefined pieceId.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import ContentConcept from '../models/ContentConcept.js';
import { getNextSequence } from '../utils/sequence.js';

const PLATFORM_CODE = { youtube: 'YT', instagram: 'IG' };
const TYPE_CODE = { 'long-video': 'LV', short: 'SH', carousel: 'CA', 'community-post': 'CP' };

function slugify(text) {
  const slug = String(text || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 16);
  return slug || 'GENERAL';
}

async function buildPieceId({ platform, type, slugSource }) {
  const seq = await getNextSequence('content-piece');
  return `${PLATFORM_CODE[platform]}-${TYPE_CODE[type]}-${slugify(slugSource)}-${String(seq).padStart(4, '0')}`;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const concepts = await ContentConcept.find({ 'pieces.pieceId': { $exists: false } });
  console.log(`Found ${concepts.length} concept(s) with at least one piece missing a pieceId.`);

  let fixed = 0;
  for (const concept of concepts) {
    for (const piece of concept.pieces) {
      if (!piece.pieceId) {
        // eslint-disable-next-line no-await-in-loop
        piece.pieceId = await buildPieceId({
          platform: piece.platform,
          type: piece.type,
          slugSource: concept.topic || concept.chapter || concept.title,
        });
        fixed += 1;
      }
    }
    // eslint-disable-next-line no-await-in-loop
    await concept.save();
    console.log(`Fixed concept ${concept.conceptId}`);
  }

  console.log(`\nDone — assigned pieceId to ${fixed} piece(s).`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Backfill failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
