import Topper from '../models/Topper.js';
import { ApiError } from '../utils/ApiError.js';

export async function getAllToppers() {
  return Topper.find().populate('courseId', 'title').sort({ order: 1, createdAt: -1 }).lean();
}

export async function createTopper(payload) {
  const topper = await Topper.create(payload);
  return topper.toObject();
}

export async function updateTopper(id, payload) {
  const topper = await Topper.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean();
  if (!topper) throw new ApiError(404, 'Topper not found');
  return topper;
}

export async function deleteTopper(id) {
  const topper = await Topper.findByIdAndDelete(id).lean();
  if (!topper) throw new ApiError(404, 'Topper not found');
  return topper;
}

export async function setTopperPhoto(id, photoUrl) {
  const topper = await Topper.findByIdAndUpdate(id, { photoUrl }, { new: true }).lean();
  if (!topper) throw new ApiError(404, 'Topper not found');
  return topper;
}
