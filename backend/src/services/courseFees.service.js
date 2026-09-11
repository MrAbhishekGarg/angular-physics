import CourseFeeBatch from '../models/CourseFeeBatch.js';
import CourseFeeStudent from '../models/CourseFeeStudent.js';
import Course from '../models/Course.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * feePaid/feeDue/securityDue are always derived, never stored — a one-time
 * payer's totals come from `payments`, a monthly payer's from whichever
 * months in `monthlyPayments` are marked paid vs still pending.
 */
function withFeeTotals(student) {
  let feePaid;
  let feeTotal;
  if (student.feeType === 'monthly') {
    feeTotal = student.monthlyPayments.reduce((sum, m) => sum + m.amount, 0);
    feePaid = student.monthlyPayments.filter((m) => m.paid).reduce((sum, m) => sum + m.amount, 0);
  } else {
    feeTotal = student.totalFee;
    feePaid = student.payments.reduce((sum, p) => sum + p.amount, 0);
  }
  return {
    ...student,
    feeTotal,
    feePaid,
    feeDue: feeTotal - feePaid,
    securityDue: (student.securityAmount || 0) - (student.securityPaid || 0),
  };
}

/**
 * Every batch with its linked course, students (fee totals derived, never
 * stored), and an overall summary — the one call the Course Fees page needs.
 */
export async function listBatches() {
  const [batches, students, courses] = await Promise.all([
    CourseFeeBatch.find().sort({ createdAt: -1 }).lean(),
    CourseFeeStudent.find().sort({ name: 1 }).lean(),
    Course.find().select('title slug track price').lean(),
  ]);

  const courseById = new Map(courses.map((c) => [String(c._id), c]));

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
    const batchFees = batchStudents.reduce((s, st) => s + st.feeTotal, 0);
    const batchPaid = batchStudents.reduce((s, st) => s + st.feePaid, 0);
    totalFees += batchFees;
    totalPaid += batchPaid;
    totalStudents += batchStudents.length;
    return {
      ...b,
      course: courseById.get(String(b.courseId)) || null,
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
  const course = await Course.findById(payload.courseId).lean();
  if (!course) throw new ApiError(404, 'Course not found — pick a course from the list.');

  const created = await CourseFeeBatch.create({
    courseId: payload.courseId,
    standardFee: payload.standardFee === '' || payload.standardFee === undefined || payload.standardFee === null ? null : Number(payload.standardFee),
    classHoursPerWeek: payload.classHoursPerWeek || 0,
    doubtsPerWeek: payload.doubtsPerWeek || 0,
    testsConducted: payload.testsConducted || 0,
    sheetsNotesProvided: payload.sheetsNotesProvided || 0,
    notes: payload.notes || '',
  });
  return created.toObject();
}

export async function updateBatch(id, payload) {
  if (payload.courseId !== undefined) {
    const course = await Course.findById(payload.courseId).lean();
    if (!course) throw new ApiError(404, 'Course not found — pick a course from the list.');
  }

  const allowed = {};
  ['courseId', 'classHoursPerWeek', 'doubtsPerWeek', 'testsConducted', 'sheetsNotesProvided', 'notes'].forEach((key) => {
    if (payload[key] !== undefined) allowed[key] = payload[key];
  });
  if (payload.standardFee !== undefined) {
    allowed.standardFee = payload.standardFee === '' || payload.standardFee === null ? null : Number(payload.standardFee);
  }
  const updated = await CourseFeeBatch.findByIdAndUpdate(id, allowed, { new: true, runValidators: true }).lean();
  if (!updated) throw new ApiError(404, 'Batch not found');
  return updated;
}

export async function deleteBatch(id) {
  const deleted = await CourseFeeBatch.findByIdAndDelete(id).lean();
  if (!deleted) throw new ApiError(404, 'Batch not found');
  await CourseFeeStudent.deleteMany({ batchId: id });
  return deleted;
}

export async function createStudent(batchId, payload) {
  const batch = await CourseFeeBatch.findById(batchId).lean();
  if (!batch) throw new ApiError(404, 'Batch not found');

  const feeType = payload.feeType === 'monthly' ? 'monthly' : 'one-time';
  const created = await CourseFeeStudent.create({
    batchId,
    name: payload.name,
    contact: payload.contact || '',
    feeType,
    totalFee: feeType === 'one-time' ? payload.totalFee || 0 : 0,
    monthlyFee: feeType === 'monthly' ? payload.monthlyFee || 0 : 0,
    securityAmount: payload.securityAmount || 0,
    securityPaid: payload.securityPaid || 0,
    notes: payload.notes || '',
  });
  return withFeeTotals(created.toObject());
}

export async function updateStudent(id, payload) {
  const allowed = {};
  ['name', 'contact', 'feeType', 'totalFee', 'monthlyFee', 'securityAmount', 'securityPaid', 'notes'].forEach((key) => {
    if (payload[key] !== undefined) allowed[key] = payload[key];
  });
  const updated = await CourseFeeStudent.findByIdAndUpdate(id, allowed, { new: true, runValidators: true }).lean();
  if (!updated) throw new ApiError(404, 'Student not found');
  return withFeeTotals(updated);
}

export async function deleteStudent(id) {
  const deleted = await CourseFeeStudent.findByIdAndDelete(id).lean();
  if (!deleted) throw new ApiError(404, 'Student not found');
  return deleted;
}

// ---- one-time payers: a free-form payments log ----

export async function addPayment(studentId, { amount, date, note }) {
  if (!amount || Number(amount) <= 0) throw new ApiError(400, 'Payment amount must be greater than zero.');
  const student = await CourseFeeStudent.findById(studentId);
  if (!student) throw new ApiError(404, 'Student not found');
  student.payments.push({ amount: Number(amount), date: date ? new Date(date) : new Date(), note: note || '' });
  await student.save();
  return withFeeTotals(student.toObject());
}

export async function removePayment(studentId, paymentId) {
  const student = await CourseFeeStudent.findById(studentId);
  if (!student) throw new ApiError(404, 'Student not found');
  const before = student.payments.length;
  student.payments = student.payments.filter((p) => String(p._id) !== String(paymentId));
  if (student.payments.length === before) throw new ApiError(404, 'Payment not found');
  await student.save();
  return withFeeTotals(student.toObject());
}

// ---- monthly payers: an explicit month-by-month ledger ----

export async function addMonthPayment(studentId, { month, amount, paid, paidDate, note }) {
  if (!month) throw new ApiError(400, 'Month is required.');
  const student = await CourseFeeStudent.findById(studentId);
  if (!student) throw new ApiError(404, 'Student not found');
  student.monthlyPayments.push({
    month,
    amount: Number(amount) || 0,
    paid: !!paid,
    paidDate: paid && paidDate ? new Date(paidDate) : null,
    note: note || '',
  });
  await student.save();
  return withFeeTotals(student.toObject());
}

export async function updateMonthPayment(studentId, monthEntryId, payload) {
  const student = await CourseFeeStudent.findById(studentId);
  if (!student) throw new ApiError(404, 'Student not found');
  const entry = student.monthlyPayments.id(monthEntryId);
  if (!entry) throw new ApiError(404, 'Month entry not found');
  if (payload.amount !== undefined) entry.amount = Number(payload.amount) || 0;
  if (payload.paid !== undefined) entry.paid = !!payload.paid;
  if (payload.paidDate !== undefined) entry.paidDate = payload.paidDate ? new Date(payload.paidDate) : null;
  if (payload.note !== undefined) entry.note = payload.note;
  // Marking paid without ever giving a date defaults to today — the mentor
  // is confirming payment right now if they don't say otherwise.
  if (entry.paid && !entry.paidDate) entry.paidDate = new Date();
  if (!entry.paid) entry.paidDate = null;
  await student.save();
  return withFeeTotals(student.toObject());
}

export async function removeMonthPayment(studentId, monthEntryId) {
  const student = await CourseFeeStudent.findById(studentId);
  if (!student) throw new ApiError(404, 'Student not found');
  const before = student.monthlyPayments.length;
  student.monthlyPayments = student.monthlyPayments.filter((m) => String(m._id) !== String(monthEntryId));
  if (student.monthlyPayments.length === before) throw new ApiError(404, 'Month entry not found');
  await student.save();
  return withFeeTotals(student.toObject());
}
