import JobFeeBatch from '../models/JobFeeBatch.js';
import JobFeeStudent from '../models/JobFeeStudent.js';
import { ApiError } from '../utils/ApiError.js';

function withFeeTotals(student) {
  const feePaid = student.payments.reduce((sum, p) => sum + p.amount, 0);
  return { ...student, feePaid, feeDue: student.totalFee - feePaid };
}

/**
 * Every batch with its students (fee totals derived, never stored) plus an
 * overall summary — the one call the Fees page needs.
 */
export async function listBatches() {
  const [batches, students] = await Promise.all([
    JobFeeBatch.find().sort({ createdAt: -1 }).lean(),
    JobFeeStudent.find().sort({ name: 1 }).lean(),
  ]);

  const studentsByBatch = new Map();
  students.forEach((s) => {
    const key = String(s.batchId);
    if (!studentsByBatch.has(key)) studentsByBatch.set(key, []);
    studentsByBatch.get(key).push(withFeeTotals(s));
  });

  let totalFees = 0;
  let totalPaid = 0;
  let totalStudents = 0;

  const result = batches.map((b) => {
    const batchStudents = studentsByBatch.get(String(b._id)) || [];
    const batchFees = batchStudents.reduce((s, st) => s + st.totalFee, 0);
    const batchPaid = batchStudents.reduce((s, st) => s + st.feePaid, 0);
    totalFees += batchFees;
    totalPaid += batchPaid;
    totalStudents += batchStudents.length;
    return {
      ...b,
      students: batchStudents,
      studentCount: batchStudents.length,
      totalFees: batchFees,
      totalPaid: batchPaid,
      totalDue: batchFees - batchPaid,
    };
  });

  return {
    batches: result,
    summary: { totalStudents, totalFees, totalPaid, totalDue: totalFees - totalPaid, batchCount: batches.length },
  };
}

export async function createBatch(payload) {
  const created = await JobFeeBatch.create({
    name: payload.name,
    type: payload.type === 'recorded' ? 'recorded' : 'live',
    classHoursPerWeek: payload.classHoursPerWeek || 0,
    doubtsPerWeek: payload.doubtsPerWeek || 0,
    testsConducted: payload.testsConducted || 0,
    sheetsNotesProvided: payload.sheetsNotesProvided || 0,
    notes: payload.notes || '',
  });
  return created.toObject();
}

export async function updateBatch(id, payload) {
  const allowed = {};
  ['name', 'type', 'classHoursPerWeek', 'doubtsPerWeek', 'testsConducted', 'sheetsNotesProvided', 'notes'].forEach((key) => {
    if (payload[key] !== undefined) allowed[key] = payload[key];
  });
  const updated = await JobFeeBatch.findByIdAndUpdate(id, allowed, { new: true, runValidators: true }).lean();
  if (!updated) throw new ApiError(404, 'Batch not found');
  return updated;
}

export async function deleteBatch(id) {
  const deleted = await JobFeeBatch.findByIdAndDelete(id).lean();
  if (!deleted) throw new ApiError(404, 'Batch not found');
  await JobFeeStudent.deleteMany({ batchId: id });
  return deleted;
}

export async function createStudent(batchId, payload) {
  const batch = await JobFeeBatch.findById(batchId).lean();
  if (!batch) throw new ApiError(404, 'Batch not found');

  const created = await JobFeeStudent.create({
    batchId,
    name: payload.name,
    contact: payload.contact || '',
    totalFee: payload.totalFee || 0,
    notes: payload.notes || '',
  });
  return withFeeTotals(created.toObject());
}

export async function updateStudent(id, payload) {
  const allowed = {};
  ['name', 'contact', 'totalFee', 'notes'].forEach((key) => {
    if (payload[key] !== undefined) allowed[key] = payload[key];
  });
  const updated = await JobFeeStudent.findByIdAndUpdate(id, allowed, { new: true, runValidators: true }).lean();
  if (!updated) throw new ApiError(404, 'Student not found');
  return withFeeTotals(updated);
}

export async function deleteStudent(id) {
  const deleted = await JobFeeStudent.findByIdAndDelete(id).lean();
  if (!deleted) throw new ApiError(404, 'Student not found');
  return deleted;
}

export async function addPayment(studentId, { amount, date, note }) {
  if (!amount || Number(amount) <= 0) throw new ApiError(400, 'Payment amount must be greater than zero.');
  const student = await JobFeeStudent.findById(studentId);
  if (!student) throw new ApiError(404, 'Student not found');
  student.payments.push({ amount: Number(amount), date: date ? new Date(date) : new Date(), note: note || '' });
  await student.save();
  return withFeeTotals(student.toObject());
}

export async function removePayment(studentId, paymentId) {
  const student = await JobFeeStudent.findById(studentId);
  if (!student) throw new ApiError(404, 'Student not found');
  const before = student.payments.length;
  student.payments = student.payments.filter((p) => String(p._id) !== String(paymentId));
  if (student.payments.length === before) throw new ApiError(404, 'Payment not found');
  await student.save();
  return withFeeTotals(student.toObject());
}
