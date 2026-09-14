import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import CourseFeeBatch from '../models/CourseFeeBatch.js';
import CourseFeeStudent from '../models/CourseFeeStudent.js';
import CourseFeeClassLog from '../models/CourseFeeClassLog.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import * as notificationService from './notification.service.js';

const SALT_ROUNDS = 10;

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
    securityAvailable: (student.securityPaid || 0) - (student.securityApplied || 0),
  };
}

/**
 * Every batch with its linked course, students (fee totals derived, never
 * stored), and an overall summary — the one call the Course Fees page needs.
 */
export async function listBatches() {
  const [batches, students, courses, classLogs] = await Promise.all([
    CourseFeeBatch.find().sort({ createdAt: -1 }).lean(),
    CourseFeeStudent.find().sort({ name: 1 }).lean(),
    Course.find().select('title slug track price').lean(),
    CourseFeeClassLog.find().sort({ date: -1 }).lean(),
  ]);

  const courseById = new Map(courses.map((c) => [String(c._id), c]));

  const studentsByBatch = new Map();
  students.forEach((s) => {
    const key = String(s.batchId);
    if (!studentsByBatch.has(key)) studentsByBatch.set(key, []);
    studentsByBatch.get(key).push(withFeeTotals(s));
  });

  const logsByBatch = new Map();
  classLogs.forEach((log) => {
    const key = String(log.batchId);
    if (!logsByBatch.has(key)) logsByBatch.set(key, []);
    logsByBatch.get(key).push(log);
  });

  let totalFees = 0;
  let totalPaid = 0;
  let totalStudents = 0;

  const result = batches.map((b) => {
    const batchStudents = studentsByBatch.get(String(b._id)) || [];
    const batchLogs = logsByBatch.get(String(b._id)) || [];
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
      // Real taught-classes history (see CourseFeeClassLog) — distinct from
      // classHoursPerWeek, which is a weekly-plan rate, not a cumulative count.
      classLogs: batchLogs,
      classesDone: batchLogs.length,
      hoursDone: batchLogs.reduce((s, l) => s + (l.hours || 0), 0),
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
    scheduleType: ['weekend', 'semi-weekend'].includes(payload.scheduleType) ? payload.scheduleType : 'regular',
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
  if (payload.scheduleType !== undefined) {
    allowed.scheduleType = ['weekend', 'semi-weekend'].includes(payload.scheduleType) ? payload.scheduleType : 'regular';
  }
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
  await CourseFeeClassLog.deleteMany({ batchId: id });
  return deleted;
}

// ---- classes actually taught (item 9's "classes/hours/topics covered") ----

export async function addClassLog(batchId, { date, hours, topicsCovered, notes }) {
  const batch = await CourseFeeBatch.findById(batchId).lean();
  if (!batch) throw new ApiError(404, 'Batch not found');
  const created = await CourseFeeClassLog.create({
    batchId,
    date: date ? new Date(date) : new Date(),
    hours: Number(hours) || 1,
    topicsCovered: topicsCovered || '',
    notes: notes || '',
  });
  return created.toObject();
}

export async function updateClassLog(id, payload) {
  const allowed = {};
  ['hours', 'topicsCovered', 'notes'].forEach((key) => {
    if (payload[key] !== undefined) allowed[key] = payload[key];
  });
  if (payload.date !== undefined) allowed.date = new Date(payload.date);
  const updated = await CourseFeeClassLog.findByIdAndUpdate(id, allowed, { new: true, runValidators: true }).lean();
  if (!updated) throw new ApiError(404, 'Class log not found');
  return updated;
}

export async function removeClassLog(id) {
  const deleted = await CourseFeeClassLog.findByIdAndDelete(id).lean();
  if (!deleted) throw new ApiError(404, 'Class log not found');
  return deleted;
}

// ---- forward-looking plan lists on a batch (upcoming topics/tests/worksheets) ----
// Each exported function hardcodes its own field name rather than taking one
// from the caller, so a client can never point a write at an arbitrary path.

async function addBatchListItem(batchId, field, item) {
  const batch = await CourseFeeBatch.findById(batchId);
  if (!batch) throw new ApiError(404, 'Batch not found');
  batch[field].push(item);
  await batch.save();
  return batch.toObject();
}

async function removeBatchListItem(batchId, field, itemId) {
  const batch = await CourseFeeBatch.findById(batchId);
  if (!batch) throw new ApiError(404, 'Batch not found');
  const before = batch[field].length;
  batch[field] = batch[field].filter((it) => String(it._id) !== String(itemId));
  if (batch[field].length === before) throw new ApiError(404, 'Item not found');
  await batch.save();
  return batch.toObject();
}

export const addUpcomingTopic = (batchId, { title, order }) =>
  addBatchListItem(batchId, 'upcomingTopics', { title, order: Number(order) || 0 });
export const removeUpcomingTopic = (batchId, itemId) => removeBatchListItem(batchId, 'upcomingTopics', itemId);

export const addUpcomingTest = (batchId, { title, date }) =>
  addBatchListItem(batchId, 'upcomingTests', { title, date: date ? new Date(date) : null });
export const removeUpcomingTest = (batchId, itemId) => removeBatchListItem(batchId, 'upcomingTests', itemId);

export const addUpcomingWorksheet = (batchId, { title, date }) =>
  addBatchListItem(batchId, 'upcomingWorksheets', { title, date: date ? new Date(date) : null });
export const removeUpcomingWorksheet = (batchId, itemId) => removeBatchListItem(batchId, 'upcomingWorksheets', itemId);

export async function createStudent(batchId, payload) {
  const batch = await CourseFeeBatch.findById(batchId).lean();
  if (!batch) throw new ApiError(404, 'Batch not found');

  const feeType = payload.feeType === 'monthly' ? 'monthly' : 'one-time';
  if (feeType === 'monthly' && !payload.registrationDate) {
    throw new ApiError(400, 'Registration date is required for a monthly-fee student.');
  }
  const created = await CourseFeeStudent.create({
    batchId,
    name: payload.name,
    contact: payload.contact || '',
    feeType,
    registrationDate: payload.registrationDate ? new Date(payload.registrationDate) : null,
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
  if (payload.registrationDate !== undefined) {
    allowed.registrationDate = payload.registrationDate ? new Date(payload.registrationDate) : null;
  }
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

export async function addPayment(studentId, { amount, date, note, paidVia }) {
  if (!amount || Number(amount) <= 0) throw new ApiError(400, 'Payment amount must be greater than zero.');
  const student = await CourseFeeStudent.findById(studentId);
  if (!student) throw new ApiError(404, 'Student not found');
  const amt = Number(amount);
  const via = paidVia === 'security' ? 'security' : 'cash';
  if (via === 'security') {
    const available = (student.securityPaid || 0) - (student.securityApplied || 0);
    if (amt > available) {
      throw new ApiError(400, `Only ₹${available} of security deposit is available — can't cover ₹${amt}.`);
    }
    student.securityApplied = (student.securityApplied || 0) + amt;
  }
  student.payments.push({ amount: amt, date: date ? new Date(date) : new Date(), note: note || '', paidVia: via });
  await student.save();
  return withFeeTotals(student.toObject());
}

export async function removePayment(studentId, paymentId) {
  const student = await CourseFeeStudent.findById(studentId);
  if (!student) throw new ApiError(404, 'Student not found');
  const removed = student.payments.id(paymentId);
  if (!removed) throw new ApiError(404, 'Payment not found');
  if (removed.paidVia === 'security') {
    student.securityApplied = Math.max(0, (student.securityApplied || 0) - removed.amount);
  }
  student.payments.pull(paymentId);
  await student.save();
  return withFeeTotals(student.toObject());
}

// ---- monthly payers: an explicit month-by-month ledger ----

export async function addMonthPayment(studentId, { month, amount, dueDate, paid, paidDate, paidVia, note }) {
  if (!month) throw new ApiError(400, 'Month is required.');
  const student = await CourseFeeStudent.findById(studentId);
  if (!student) throw new ApiError(404, 'Student not found');
  const amt = Number(amount) || 0;
  const via = paidVia === 'security' ? 'security' : 'cash';
  if (paid && via === 'security') {
    const available = (student.securityPaid || 0) - (student.securityApplied || 0);
    if (amt > available) {
      throw new ApiError(400, `Only ₹${available} of security deposit is available — can't cover ₹${amt}.`);
    }
    student.securityApplied = (student.securityApplied || 0) + amt;
  }
  student.monthlyPayments.push({
    month,
    amount: amt,
    dueDate: dueDate ? new Date(dueDate) : null,
    paid: !!paid,
    paidDate: paid ? (paidDate ? new Date(paidDate) : new Date()) : null,
    paidVia: paid ? via : 'cash',
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

  const wasPaidViaSecurity = entry.paid && entry.paidVia === 'security';
  const previousAmount = entry.amount;

  if (payload.amount !== undefined) entry.amount = Number(payload.amount) || 0;
  if (payload.dueDate !== undefined) entry.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
  if (payload.note !== undefined) entry.note = payload.note;

  if (payload.paidVia === 'security') {
    // Marking (or re-marking) this month as covered by the security deposit
    // is itself the "pay" action — it doesn't need a separate paid:true.
    const available = (student.securityPaid || 0) - (student.securityApplied || 0);
    if (entry.amount > available) {
      throw new ApiError(400, `Only ₹${available} of security deposit is available — can't cover ₹${entry.amount}.`);
    }
    entry.paidVia = 'security';
    entry.paid = true;
    entry.paidDate = payload.paidDate ? new Date(payload.paidDate) : new Date();
    student.securityApplied = (student.securityApplied || 0) + entry.amount;
  } else {
    if (payload.paid !== undefined) entry.paid = !!payload.paid;
    if (payload.paidDate !== undefined) entry.paidDate = payload.paidDate ? new Date(payload.paidDate) : null;
    if (payload.paidVia !== undefined) entry.paidVia = 'cash';
    if (wasPaidViaSecurity && !entry.paid) {
      // Unmarking a security-covered month frees that part of the deposit again.
      student.securityApplied = Math.max(0, (student.securityApplied || 0) - previousAmount);
    }
  }

  // Marking paid without ever giving a date defaults to today — the mentor
  // is confirming payment right now if they don't say otherwise.
  if (entry.paid && !entry.paidDate) entry.paidDate = new Date();
  if (!entry.paid) entry.paidDate = null;
  // Approving a payment (marking paid) resolves any pending student claim.
  if (entry.paid) entry.claimedByStudent = false;

  await student.save();
  return withFeeTotals(student.toObject());
}

export async function removeMonthPayment(studentId, monthEntryId) {
  const student = await CourseFeeStudent.findById(studentId);
  if (!student) throw new ApiError(404, 'Student not found');
  const removed = student.monthlyPayments.id(monthEntryId);
  if (!removed) throw new ApiError(404, 'Month entry not found');
  if (removed.paid && removed.paidVia === 'security') {
    student.securityApplied = Math.max(0, (student.securityApplied || 0) - removed.amount);
  }
  student.monthlyPayments.pull(monthEntryId);
  await student.save();
  return withFeeTotals(student.toObject());
}

// ---- student self-service (item 6) ----

export async function getMyCourseFee(userId) {
  const student = await CourseFeeStudent.findOne({ userId }).lean();
  if (!student) throw new ApiError(404, "You're not registered for fee tracking yet.");
  const batch = await CourseFeeBatch.findById(student.batchId).lean();
  const course = batch ? await Course.findById(batch.courseId).select('title slug track').lean() : null;
  return { ...withFeeTotals(student), batch: batch ? { ...batch, course } : null };
}

export async function getMySchedule(userId) {
  const student = await CourseFeeStudent.findOne({ userId }).lean();
  if (!student) throw new ApiError(404, "You're not registered for fee tracking yet.");
  const batch = await CourseFeeBatch.findById(student.batchId).lean();
  if (!batch) throw new ApiError(404, 'Batch not found');
  const classLogs = await CourseFeeClassLog.find({ batchId: batch._id }).sort({ date: -1 }).lean();
  return {
    scheduleType: batch.scheduleType,
    classHoursPerWeek: batch.classHoursPerWeek,
    upcomingTopics: batch.upcomingTopics,
    upcomingTests: batch.upcomingTests,
    upcomingWorksheets: batch.upcomingWorksheets,
    classLogs,
    classesDone: classLogs.length,
    hoursDone: classLogs.reduce((s, l) => s + (l.hours || 0), 0),
  };
}

/**
 * Student self-reports a month as paid — a non-blocking flag the mentor
 * reviews via updateMonthPayment's existing paid/paidDate fields. Ownership
 * is enforced here (studentId comes from req.user, not the request body),
 * so a student can only ever claim their own record.
 */
export async function claimMonthPayment(userId, monthEntryId) {
  const student = await CourseFeeStudent.findOne({ userId });
  if (!student) throw new ApiError(404, "You're not registered for fee tracking yet.");
  const entry = student.monthlyPayments.id(monthEntryId);
  if (!entry) throw new ApiError(404, 'Month entry not found');
  if (!entry.paid) {
    entry.claimedByStudent = true;
    entry.claimedAt = new Date();
    await student.save();
  }
  return withFeeTotals(student.toObject());
}

// ---- admin-triggered reminders (item 5) ----

export async function sendFeeReminder(studentId, { month }) {
  const student = await CourseFeeStudent.findById(studentId).lean();
  if (!student) throw new ApiError(404, 'Student not found');
  if (!student.userId) throw new ApiError(409, 'This student has no login account yet — nothing to notify.');

  const batch = await CourseFeeBatch.findById(student.batchId).lean();
  const course = batch ? await Course.findById(batch.courseId).select('title').lean() : null;
  const courseName = course?.title || 'your course';

  let message;
  if (month) {
    const entry = student.monthlyPayments.find((m) => m.month === month);
    const amount = entry?.amount ?? student.monthlyFee;
    const dueBit = entry?.dueDate ? ` by ${new Date(entry.dueDate).toLocaleDateString('en-IN')}` : '';
    message = `Your fee of ₹${amount} for ${month} (${courseName}) is due${dueBit}.`;
  } else {
    message = `You have a pending fee due for ${courseName} — please check your fee summary.`;
  }

  await notificationService.createNotification({
    userId: student.userId,
    type: 'fee-reminder',
    title: 'Fee reminder',
    message,
  });
  return { sent: true };
}

function generatePassword() {
  // 10 URL-safe characters — short enough to read/type back to a student
  // over WhatsApp, random enough not to guess.
  return crypto.randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
}

/**
 * Gives a fee-tracked student an actual login account — a real User
 * (role: 'student'), linked back via `userId`, kept deliberately separate
 * from course enrollment: this only creates the account, it doesn't grant
 * access to any course. There's no email infrastructure in this app (same
 * situation as password resets — see auth.service.js), so when the caller
 * doesn't supply their own password, one is generated and returned once for
 * the mentor to relay out of band.
 */
export async function registerStudentAccount(feeStudentId, { email, phone, password }) {
  const feeStudent = await CourseFeeStudent.findById(feeStudentId);
  if (!feeStudent) throw new ApiError(404, 'Student not found');
  if (feeStudent.userId) throw new ApiError(409, 'This student already has a login account.');

  const normalizedEmail = String(email || '').toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail }).lean();
  if (existing) throw new ApiError(409, 'A user with this email already exists.');

  const finalPassword = password || generatePassword();
  const passwordHash = await bcrypt.hash(finalPassword, SALT_ROUNDS);

  let user;
  try {
    user = await User.create({ name: feeStudent.name, email: normalizedEmail, phone, passwordHash, role: 'student' });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'A user with this email already exists.');
    throw err;
  }

  feeStudent.userId = user._id;
  await feeStudent.save();

  return { student: withFeeTotals(feeStudent.toObject()), generatedPassword: password ? null : finalPassword };
}
