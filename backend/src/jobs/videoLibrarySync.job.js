import { syncFromYoutube, isYoutubeConfigured } from '../services/videoLibrary.service.js';

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
const INITIAL_DELAY_MS = 60 * 1000; // let the server finish booting first

async function runSync() {
  if (!isYoutubeConfigured()) return;
  try {
    const result = await syncFromYoutube();
    console.log(
      `[video-sync] synced ${result.videosSynced} video(s), removed ${result.videosRemoved} stale, across ${result.playlistsSynced} playlist(s)`
    );
  } catch (err) {
    console.warn(`[video-sync] skipped: ${err.message}`);
  }
}

/**
 * The public /videos page previously only ever refreshed when a mentor
 * remembered to click "Reset — Sync from YouTube" — new uploads (and
 * deleted videos, see the prune step in syncFromYoutube) could sit stale
 * indefinitely. This keeps the library current automatically.
 */
export function startVideoLibrarySync() {
  setTimeout(() => {
    runSync();
    setInterval(runSync, SYNC_INTERVAL_MS);
  }, INITIAL_DELAY_MS);
}
