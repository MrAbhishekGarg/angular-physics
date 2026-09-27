/**
 * One-time migration: moves every existing YouTube video-tracker entry into
 * the Content Planner as its own concept (one piece each), before that
 * older module is removed. Real production data (status, source, PYQ info,
 * link) is preserved — nothing is silently dropped by retiring the tracker.
 *
 * Run once per environment: `node src/scripts/migrateVideoTrackerToContentPlanner.js`
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

async function buildConceptId(title) {
  const seq = await getNextSequence('content-concept');
  return `CP-${slugify(title)}-${String(seq).padStart(4, '0')}`;
}

async function buildPieceId({ platform, type, slugSource }) {
  const seq = await getNextSequence('content-piece');
  return `${PLATFORM_CODE[platform]}-${TYPE_CODE[type]}-${slugify(slugSource)}-${String(seq).padStart(4, '0')}`;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections({ name: 'videotrackerentries' }).toArray();
  if (collections.length === 0) {
    console.log('No videotrackerentries collection found — nothing to migrate.');
    await mongoose.disconnect();
    return;
  }

  const entries = await db.collection('videotrackerentries').find({}).toArray();
  console.log(`Found ${entries.length} video tracker entries to migrate.`);

  for (const entry of entries) {
    const title = entry.title || entry.videoId;
    const chapter = entry.chapters?.[0] || '';
    const topic = entry.topics?.[0] || '';
    const conceptId = await buildConceptId(title);
    const type = entry.format === 'long' ? 'long-video' : 'short';
    const pieceId = await buildPieceId({ platform: 'youtube', type, slugSource: topic || chapter || title });

    await ContentConcept.create({
      conceptId,
      title,
      chapter,
      topic,
      notes: entry.notes || '',
      createdByName: entry.createdByName || '',
      pieces: [
        {
          pieceId,
          platform: 'youtube',
          type,
          label: title,
          status: entry.status || 'planned',
          source: entry.source || '',
          isPYQ: Boolean(entry.isPYQ),
          pyqYear: entry.pyqYear || null,
          link: entry.youtubeUrl || '',
          notes: '',
        },
      ],
    });

    console.log(`Migrated "${entry.videoId}" -> concept ${conceptId}, piece ${pieceId}`);
  }

  console.log(`\nDone — migrated ${entries.length} entries.`);
  console.log('Once verified, the videotrackerentries collection can be dropped manually if desired (left in place for now, as a safety net).');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Migration failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
