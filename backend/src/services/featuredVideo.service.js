import FeaturedVideo from '../models/FeaturedVideo.js';
import { ApiError } from '../utils/ApiError.js';

export async function getAllFeaturedVideos() {
  return FeaturedVideo.find().sort({ order: 1, createdAt: -1 }).lean();
}

export async function createFeaturedVideo(payload) {
  const video = await FeaturedVideo.create(payload);
  return video.toObject();
}

export async function updateFeaturedVideo(id, payload) {
  const video = await FeaturedVideo.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean();
  if (!video) throw new ApiError(404, 'Featured video not found');
  return video;
}

export async function deleteFeaturedVideo(id) {
  const video = await FeaturedVideo.findByIdAndDelete(id).lean();
  if (!video) throw new ApiError(404, 'Featured video not found');
  return video;
}
