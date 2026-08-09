import { env } from '../config/env.js';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — keeps us well within API quota
const API_BASE = 'https://www.googleapis.com/youtube/v3';

let cache = { fetchedAt: 0, videos: [] };

export function isYoutubeConfigured() {
  return Boolean(env.youtubeApiKey && env.youtubeChannelId);
}

/**
 * Returns the channel's latest uploads as [{ videoId, title, publishedAt, thumbnailUrl }].
 * Returns [] gracefully (never throws) whenever the API key/channel id are
 * unset or the API call fails — matches config/razorpay.js's null-when-
 * unconfigured pattern so a quota hiccup never breaks the homepage.
 */
export async function getLatestUploads(maxResults = 6) {
  if (!isYoutubeConfigured()) return [];

  if (Date.now() - cache.fetchedAt < CACHE_TTL_MS && cache.videos.length > 0) {
    return cache.videos.slice(0, maxResults);
  }

  try {
    const channelRes = await fetch(
      `${API_BASE}/channels?part=contentDetails&id=${env.youtubeChannelId}&key=${env.youtubeApiKey}`
    );
    const channelData = await channelRes.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) return [];

    const itemsRes = await fetch(
      `${API_BASE}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=12&key=${env.youtubeApiKey}`
    );
    const itemsData = await itemsRes.json();

    const videos = (itemsData.items || [])
      .filter((item) => item.snippet?.resourceId?.videoId)
      .map((item) => ({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl:
          item.snippet.thumbnails?.high?.url ||
          item.snippet.thumbnails?.default?.url ||
          `https://i.ytimg.com/vi/${item.snippet.resourceId.videoId}/hqdefault.jpg`,
      }));

    cache = { fetchedAt: Date.now(), videos };
    return videos.slice(0, maxResults);
  } catch (err) {
    console.warn('[youtube] Failed to fetch latest uploads:', err.message);
    return cache.videos.slice(0, maxResults);
  }
}
