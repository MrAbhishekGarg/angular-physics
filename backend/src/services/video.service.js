import path from 'path';
import Video from '../models/Video.js';
import Enrollment from '../models/Enrollment.js';
import { ApiError } from '../utils/ApiError.js';
import { parseYoutubeId } from '../utils/youtube.js';
import { SECURE_UPLOADS_ROOT } from '../middleware/upload.js';

export async function getVideosForCourse(courseId) {
  return Video.find({ courseId }).sort({ order: 1, createdAt: 1 }).lean();
}

export async function getVideoById(id) {
  const video = await Video.findById(id).lean();
  if (!video) throw new ApiError(404, 'Video not found');
  return video;
}

export async function createVideo(payload) {
  const data = { ...payload };
  if (data.source === 'youtube') {
    const youtubeVideoId = parseYoutubeId(data.youtubeVideoId);
    if (!youtubeVideoId) throw new ApiError(400, 'Could not parse a YouTube video id from that URL');
    data.youtubeVideoId = youtubeVideoId;
  }
  const video = await Video.create(data);
  return video.toObject();
}

export async function updateVideo(id, payload) {
  const data = { ...payload };
  if (data.source === 'youtube' && data.youtubeVideoId) {
    const youtubeVideoId = parseYoutubeId(data.youtubeVideoId);
    if (!youtubeVideoId) throw new ApiError(400, 'Could not parse a YouTube video id from that URL');
    data.youtubeVideoId = youtubeVideoId;
  }
  const video = await Video.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  if (!video) throw new ApiError(404, 'Video not found');
  return video;
}

export async function deleteVideo(id) {
  const video = await Video.findByIdAndDelete(id).lean();
  if (!video) throw new ApiError(404, 'Video not found');
  return video;
}

export async function setVideoFile(id, { fileKey, fileName, fileType, fileSizeBytes }) {
  const video = await Video.findByIdAndUpdate(
    id,
    { fileKey, fileName, fileType, fileSizeBytes },
    { new: true }
  ).lean();
  if (!video) throw new ApiError(404, 'Video not found');
  return video;
}

/**
 * Checks the requester is the mentor or an active/completed enrollee of the
 * video's course, then resolves the absolute file path for streaming.
 */
export async function resolveVideoFileForStreaming(id, user) {
  const video = await Video.findById(id).lean();
  if (!video) throw new ApiError(404, 'Video not found');
  if (video.source !== 'upload' || !video.fileKey) {
    throw new ApiError(400, 'This video has no uploaded file to stream');
  }

  if (user.role !== 'mentor' && user.role !== 'admin') {
    const enrollment = await Enrollment.findOne({
      studentId: user.id,
      courseId: video.courseId,
      status: { $in: ['active', 'completed'] },
    }).lean();
    if (!enrollment) throw new ApiError(403, 'You must be enrolled in this course to watch this video');
  }

  return {
    absolutePath: path.join(SECURE_UPLOADS_ROOT, 'videos', video.fileKey),
    mimeType: video.fileType || 'video/mp4',
  };
}
