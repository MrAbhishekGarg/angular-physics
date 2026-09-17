import StudentBatch from '../models/StudentBatch.js';
import { ApiError } from '../utils/ApiError.js';

export async function listBatches() {
  return StudentBatch.find().populate('studentIds', 'name email').sort({ name: 1 }).lean();
}

export async function getBatchById(id) {
  const batch = await StudentBatch.findById(id).populate('studentIds', 'name email').lean();
  if (!batch) throw new ApiError(404, 'Batch not found');
  return batch;
}

export async function createBatch({ name, description }) {
  if (!name?.trim()) throw new ApiError(400, 'Batch name is required');
  const existing = await StudentBatch.findOne({ name: name.trim() }).lean();
  if (existing) throw new ApiError(409, `A batch named "${name.trim()}" already exists.`);
  const batch = await StudentBatch.create({ name: name.trim(), description: description || '' });
  return batch.toObject();
}

export async function updateBatch(id, { name, description }) {
  const update = {};
  if (name !== undefined) {
    if (!name.trim()) throw new ApiError(400, 'Batch name cannot be empty');
    const clash = await StudentBatch.findOne({ name: name.trim(), _id: { $ne: id } }).lean();
    if (clash) throw new ApiError(409, `A batch named "${name.trim()}" already exists.`);
    update.name = name.trim();
  }
  if (description !== undefined) update.description = description;
  const batch = await StudentBatch.findByIdAndUpdate(id, update, { new: true, runValidators: true })
    .populate('studentIds', 'name email')
    .lean();
  if (!batch) throw new ApiError(404, 'Batch not found');
  return batch;
}

export async function deleteBatch(id) {
  const deleted = await StudentBatch.findByIdAndDelete(id).lean();
  if (!deleted) throw new ApiError(404, 'Batch not found');
  return deleted;
}

/** Replaces the whole membership list wholesale — mirrors how Worksheet's courseIds assignment works. */
export async function setBatchStudents(id, studentIds) {
  const batch = await StudentBatch.findByIdAndUpdate(id, { studentIds: studentIds || [] }, { new: true, runValidators: true })
    .populate('studentIds', 'name email')
    .lean();
  if (!batch) throw new ApiError(404, 'Batch not found');
  return batch;
}

/** Every batch id a student belongs to, as strings — used by note/worksheet eligibility checks. */
export async function getBatchIdsForStudent(studentId) {
  const batches = await StudentBatch.find({ studentIds: studentId }).select('_id').lean();
  return batches.map((b) => b._id.toString());
}
