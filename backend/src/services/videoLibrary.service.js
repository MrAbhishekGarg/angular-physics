import Playlist from '../models/Playlist.js';
import YoutubeVideo from '../models/YoutubeVideo.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { parseYoutubePlaylistId } from '../utils/youtube.js';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const MAX_PAGES = 4; // 4 x 50 = 200 videos per playlist — plenty for a coaching channel, bounds API quota use

function isYoutubeConfigured() {
  return Boolean(env.youtubeApiKey && env.youtubeChannelId);
}

function assertYoutubeConfigured() {
  if (!isYoutubeConfigured()) {
    throw new ApiError(400, 'YOUTUBE_API_KEY/YOUTUBE_CHANNEL_ID are not configured on the server.');
  }
}

function mapPlaylistItem(item) {
  const videoId = item.snippet?.resourceId?.videoId || item.contentDetails?.videoId;
  if (!videoId) return null;
  return {
    videoId,
    title: item.snippet?.title || '(untitled)',
    publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : undefined,
    thumbnailUrl:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.default?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

/** Paginates playlistItems.list up to MAX_PAGES, returning mapped video records. */
async function fetchAllPlaylistItems(playlistId) {
  const items = [];
  let pageToken = '';
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = `${API_BASE}/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${env.youtubeApiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new ApiError(400, `YouTube API error: ${data.error.message}`);
    (data.items || []).forEach((item) => {
      const mapped = mapPlaylistItem(item);
      if (mapped) items.push(mapped);
    });
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return items;
}

async function fetchChannelUploadsPlaylistId() {
  const res = await fetch(`${API_BASE}/channels?part=contentDetails&id=${env.youtubeChannelId}&key=${env.youtubeApiKey}`);
  const data = await res.json();
  if (data.error) throw new ApiError(400, `YouTube API error: ${data.error.message}`);
  const uploadsPlaylistId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) throw new ApiError(400, 'Could not resolve the channel\'s uploads playlist.');
  return uploadsPlaylistId;
}

async function fetchPlaylistTitle(youtubePlaylistId) {
  const res = await fetch(`${API_BASE}/playlists?part=snippet&id=${youtubePlaylistId}&key=${env.youtubeApiKey}`);
  const data = await res.json();
  if (data.error) throw new ApiError(400, `YouTube API error: ${data.error.message}`);
  return data.items?.[0]?.snippet?.title || null;
}

/** Upserts video records into the master library without touching playlistIds. */
async function upsertVideos(videoRecords) {
  await Promise.all(
    videoRecords.map((v) =>
      YoutubeVideo.findOneAndUpdate(
        { videoId: v.videoId },
        { $set: { title: v.title, thumbnailUrl: v.thumbnailUrl, ...(v.publishedAt ? { publishedAt: v.publishedAt } : {}) } },
        { upsert: true, new: true }
      )
    )
  );
}

/** Rebuilds one synced playlist's video membership from its live YouTube playlist. */
async function resyncPlaylistMembership(playlist) {
  if (!playlist.youtubePlaylistId) return 0;
  const items = await fetchAllPlaylistItems(playlist.youtubePlaylistId);
  await upsertVideos(items);

  const memberVideoIds = items.map((i) => i.videoId);
  await YoutubeVideo.updateMany(
    { playlistIds: playlist._id, videoId: { $nin: memberVideoIds } },
    { $pull: { playlistIds: playlist._id } }
  );
  await YoutubeVideo.updateMany(
    { videoId: { $in: memberVideoIds } },
    { $addToSet: { playlistIds: playlist._id } }
  );
  return items.length;
}

export async function listPlaylists() {
  const [playlists, counts] = await Promise.all([
    Playlist.find().sort({ order: 1, createdAt: 1 }).lean(),
    YoutubeVideo.aggregate([
      { $unwind: '$playlistIds' },
      { $group: { _id: '$playlistIds', count: { $sum: 1 } } },
    ]),
  ]);
  const countByPlaylist = new Map(counts.map((c) => [c._id.toString(), c.count]));
  return playlists.map((p) => ({ ...p, videoCount: countByPlaylist.get(p._id.toString()) || 0 }));
}

export async function listVideos({ playlistId } = {}) {
  const filter = playlistId ? { playlistIds: playlistId } : {};
  return YoutubeVideo.find(filter).sort({ publishedAt: -1, createdAt: -1 }).lean();
}

export async function createPlaylist({ title, youtubePlaylistId, description }) {
  const parsedId = youtubePlaylistId ? parseYoutubePlaylistId(youtubePlaylistId) : null;
  if (youtubePlaylistId && !parsedId) {
    throw new ApiError(400, 'That doesn\'t look like a valid YouTube playlist URL or id.');
  }

  let resolvedTitle = title;
  if (parsedId && !resolvedTitle) {
    assertYoutubeConfigured();
    resolvedTitle = await fetchPlaylistTitle(parsedId);
    if (!resolvedTitle) throw new ApiError(404, 'That YouTube playlist could not be found.');
  }
  if (!resolvedTitle) throw new ApiError(400, 'A title is required.');

  const playlist = await Playlist.create({ title: resolvedTitle, description: description || '', youtubePlaylistId: parsedId });

  if (parsedId) {
    assertYoutubeConfigured();
    await resyncPlaylistMembership(playlist);
  }

  return playlist.toObject();
}

export async function updatePlaylist(id, { title, description, order }) {
  const playlist = await Playlist.findByIdAndUpdate(
    id,
    { ...(title !== undefined ? { title } : {}), ...(description !== undefined ? { description } : {}), ...(order !== undefined ? { order } : {}) },
    { new: true, runValidators: true }
  ).lean();
  if (!playlist) throw new ApiError(404, 'Playlist not found');
  return playlist;
}

export async function deletePlaylist(id) {
  const playlist = await Playlist.findByIdAndDelete(id).lean();
  if (!playlist) throw new ApiError(404, 'Playlist not found');
  await YoutubeVideo.updateMany({ playlistIds: id }, { $pull: { playlistIds: id } });
  return playlist;
}

export async function addVideoToPlaylist(playlistId, videoId) {
  const playlist = await Playlist.findById(playlistId).lean();
  if (!playlist) throw new ApiError(404, 'Playlist not found');
  const video = await YoutubeVideo.findByIdAndUpdate(videoId, { $addToSet: { playlistIds: playlistId } }, { new: true }).lean();
  if (!video) throw new ApiError(404, 'Video not found');
  return video;
}

export async function removeVideoFromPlaylist(playlistId, videoId) {
  const video = await YoutubeVideo.findByIdAndUpdate(videoId, { $pull: { playlistIds: playlistId } }, { new: true }).lean();
  if (!video) throw new ApiError(404, 'Video not found');
  return video;
}

/**
 * "Reset" — refreshes the master video library from the channel's uploads,
 * then rebuilds every YouTube-linked playlist's membership from scratch to
 * exactly match YouTube, discarding any manual add/remove overrides on
 * those playlists. Custom playlists (no youtubePlaylistId) are untouched.
 */
export async function syncFromYoutube() {
  assertYoutubeConfigured();

  const uploadsPlaylistId = await fetchChannelUploadsPlaylistId();
  const allVideos = await fetchAllPlaylistItems(uploadsPlaylistId);
  await upsertVideos(allVideos);

  const syncedPlaylists = await Playlist.find({ youtubePlaylistId: { $ne: null } }).lean();
  let playlistVideoTotal = 0;
  for (const playlist of syncedPlaylists) {
    playlistVideoTotal += await resyncPlaylistMembership(playlist);
  }

  return { videosSynced: allVideos.length, playlistsSynced: syncedPlaylists.length, playlistVideoTotal };
}
