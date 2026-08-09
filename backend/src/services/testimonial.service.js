import Testimonial from '../models/Testimonial.js';
import { ApiError } from '../utils/ApiError.js';

export async function getAllTestimonialsForMentor() {
  return Testimonial.find().sort({ createdAt: -1 }).lean();
}

export async function createTestimonial(mentorId, payload) {
  const testimonial = await Testimonial.create({ ...payload, mentorId });
  return testimonial.toObject();
}

export async function updateTestimonial(id, payload) {
  const testimonial = await Testimonial.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean();
  if (!testimonial) throw new ApiError(404, 'Testimonial not found');
  return testimonial;
}

export async function deleteTestimonial(id) {
  const testimonial = await Testimonial.findByIdAndDelete(id).lean();
  if (!testimonial) throw new ApiError(404, 'Testimonial not found');
  return testimonial;
}
