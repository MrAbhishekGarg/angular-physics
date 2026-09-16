import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { createNotification } from './notification.service.js';

const COURSE_FIELDS = 'title slug track price durationWeeks status imageUrl';
const PURCHASED_STATUSES = ['active', 'completed'];

export async function createEnrollment(studentId, courseId) {
  const course = await Course.findById(courseId).lean();
  if (!course) throw new ApiError(404, 'Course not found');
  if (course.status === 'closed') throw new ApiError(400, 'This course is closed for enrollment');

  try {
    const enrollment = await Enrollment.create({ studentId, courseId, status: 'pending' });
    return enrollment.toObject();
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'You already enrolled (or requested) this course');
    throw err;
  }
}

export async function getStudentEnrollments(studentId) {
  return Enrollment.find({ studentId }).populate('courseId', COURSE_FIELDS).sort({ createdAt: -1 }).lean();
}

export async function getAllEnrollments({ courseId, studentIds } = {}) {
  const filter = {};
  if (courseId) filter.courseId = courseId;
  // studentIds undefined -> no filter (mentor sees everyone, or admin).
  // studentIds: [] -> $in: [] matches nothing, which is correct: a mentor
  // scoped to 'selected' students with none assigned yet should see none,
  // not fall back to "all".
  if (studentIds) filter.studentId = { $in: studentIds };
  return Enrollment.find(filter)
    .populate('courseId', COURSE_FIELDS)
    .populate('studentId', 'name email')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Every registered student — including anyone who has never enrolled in a
 * course at all — with their enrollments attached, for the "All Students"
 * page. `getAllEnrollments` above is enrollment-row-per-row and silently
 * omits students with zero enrollments; this is student-row-per-row instead,
 * left-joined against Enrollment so a never-enrolled student still shows up.
 * `studentIds` follows the same undefined=all / []=none semantics used
 * throughout mentorAccess-scoped listings.
 */
export async function getAllStudentsOverview({ studentIds } = {}) {
  const studentFilter = { role: 'student' };
  if (studentIds) studentFilter._id = { $in: studentIds };
  const students = await User.find(studentFilter).select('name email phone createdAt').sort({ createdAt: -1 }).lean();

  const enrollments = await Enrollment.find({ studentId: { $in: students.map((s) => s._id) } })
    .populate('courseId', COURSE_FIELDS)
    .sort({ createdAt: -1 })
    .lean();

  const enrollmentsByStudent = new Map();
  enrollments.forEach((e) => {
    const key = e.studentId.toString();
    if (!enrollmentsByStudent.has(key)) enrollmentsByStudent.set(key, []);
    enrollmentsByStudent.get(key).push(e);
  });

  return students.map((s) => {
    const studentEnrollments = enrollmentsByStudent.get(s._id.toString()) || [];
    return {
      _id: s._id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      createdAt: s.createdAt,
      enrollments: studentEnrollments,
      hasPurchased: studentEnrollments.some((e) => PURCHASED_STATUSES.includes(e.status)),
    };
  });
}

/**
 * Admin-only direct grant: creates (or reactivates) an 'active' enrollment
 * for a student/course pair, skipping the normal pending->mentor-approval
 * flow entirely — for giving a specific student access without them going
 * through (or having gone through) the request step. Upsert on the same
 * unique {studentId, courseId} pair the normal flow uses, so granting access
 * to an already-enrolled (even 'cancelled') student just reactivates it
 * rather than erroring on a duplicate.
 */
export async function grantCourseAccess(studentId, courseId) {
  const [student, course] = await Promise.all([
    User.findOne({ _id: studentId, role: 'student' }).select('_id').lean(),
    Course.findById(courseId).select('_id').lean(),
  ]);
  if (!student) throw new ApiError(404, 'Student not found');
  if (!course) throw new ApiError(404, 'Course not found');

  const enrollment = await Enrollment.findOneAndUpdate(
    { studentId, courseId },
    { status: 'active' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .populate('courseId', COURSE_FIELDS)
    .populate('studentId', 'name email')
    .lean();
  return enrollment;
}

/** Used only to check a mentor's student-assignment before an update. */
export async function getEnrollmentById(id) {
  const enrollment = await Enrollment.findById(id).select('studentId').lean();
  if (!enrollment) throw new ApiError(404, 'Enrollment not found');
  return enrollment;
}

export async function updateEnrollment(id, { status, progressPercent }) {
  const update = {};
  if (status !== undefined) update.status = status;
  if (progressPercent !== undefined) update.progressPercent = progressPercent;

  const enrollment = await Enrollment.findByIdAndUpdate(id, update, { new: true })
    .populate('courseId', COURSE_FIELDS)
    .populate('studentId', 'name email')
    .lean();

  if (!enrollment) throw new ApiError(404, 'Enrollment not found');
  return enrollment;
}

// ---- Live-course fee tracking (mentor/admin-managed, see Enrollment.js) ----

async function populatedEnrollment(id) {
  const enrollment = await Enrollment.findById(id).populate('courseId', COURSE_FIELDS).populate('studentId', 'name email').lean();
  if (!enrollment) throw new ApiError(404, 'Enrollment not found');
  return enrollment;
}

/** Sets the negotiated fee terms decided at registration — feeType/totalFee
 * (one-time) or monthlyFee, plus the security deposit amount. Safe to call
 * again later if terms change. */
export async function setEnrollmentFeeConfig(id, { feeType, totalFee, monthlyFee, securityAmount, feeNotes, registrationDate }) {
  const update = {};
  if (feeType !== undefined) update.feeType = feeType;
  if (totalFee !== undefined) update.totalFee = totalFee;
  if (monthlyFee !== undefined) update.monthlyFee = monthlyFee;
  if (securityAmount !== undefined) update.securityAmount = securityAmount;
  if (feeNotes !== undefined) update.feeNotes = feeNotes;
  if (registrationDate !== undefined) update.registrationDate = registrationDate;

  const result = await Enrollment.findByIdAndUpdate(id, update, { new: true });
  if (!result) throw new ApiError(404, 'Enrollment not found');
  return populatedEnrollment(id);
}

export async function setSecurityPaid(id, securityPaid) {
  const result = await Enrollment.findByIdAndUpdate(id, { securityPaid }, { new: true });
  if (!result) throw new ApiError(404, 'Enrollment not found');
  return populatedEnrollment(id);
}

export async function addPayment(id, { amount, date, note }) {
  const enrollment = await Enrollment.findByIdAndUpdate(
    id,
    { $push: { payments: { amount, date: date || new Date(), note: note || '' } } },
    { new: true }
  );
  if (!enrollment) throw new ApiError(404, 'Enrollment not found');
  return populatedEnrollment(id);
}

export async function removePayment(id, paymentId) {
  const enrollment = await Enrollment.findByIdAndUpdate(id, { $pull: { payments: { _id: paymentId } } }, { new: true });
  if (!enrollment) throw new ApiError(404, 'Enrollment not found');
  return populatedEnrollment(id);
}

export async function addMonthlyEntry(id, { month, amount, dueDate }) {
  const enrollment = await Enrollment.findById(id).select('monthlyFee');
  if (!enrollment) throw new ApiError(404, 'Enrollment not found');
  await Enrollment.findByIdAndUpdate(id, {
    $push: { monthlyPayments: { month, amount: amount ?? enrollment.monthlyFee, dueDate: dueDate || null } },
  });
  return populatedEnrollment(id);
}

export async function updateMonthlyEntry(id, monthId, { amount, dueDate, paid, paidDate, note }) {
  const enrollment = await Enrollment.findOne({ _id: id, 'monthlyPayments._id': monthId });
  if (!enrollment) throw new ApiError(404, 'Enrollment or month entry not found');

  const set = {};
  if (amount !== undefined) set['monthlyPayments.$.amount'] = amount;
  if (dueDate !== undefined) set['monthlyPayments.$.dueDate'] = dueDate;
  if (note !== undefined) set['monthlyPayments.$.note'] = note;
  if (paid !== undefined) {
    set['monthlyPayments.$.paid'] = paid;
    // An explicit paidDate lets a mentor backfill a past month's real
    // payment date instead of always stamping "now" — useful when
    // generating months for a student who registered a while ago.
    set['monthlyPayments.$.paidDate'] = paid ? paidDate || new Date() : null;
  } else if (paidDate !== undefined) {
    set['monthlyPayments.$.paidDate'] = paidDate;
  }

  await Enrollment.updateOne({ _id: id, 'monthlyPayments._id': monthId }, { $set: set });
  return populatedEnrollment(id);
}

function monthKey(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

// Same day-of-month as registrationDate, clamped to that target month's
// actual last day (a student who registered on the 31st still gets a due
// date in a 30-day or February month instead of overflowing into the next).
// Built entirely in UTC: registrationDate itself is stored as UTC midnight
// of the calendar day a mentor picked (a plain "YYYY-MM-DD" date-input
// value casts that way), and reading/writing it back through local-timezone
// getters would silently shift the day whenever the server's timezone isn't
// UTC (IST, +5:30, rolls a local midnight back into the previous UTC day).
function dueDateFor(registrationDate, year, monthIndex) {
  const lastDayOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const day = Math.min(registrationDate.getUTCDate(), lastDayOfMonth);
  return new Date(Date.UTC(year, monthIndex, day));
}

/** Fills in one monthlyPayments entry for every calendar month from
 * registrationDate through the current month that doesn't already have
 * one — lets a mentor backfill a student's whole history in one action
 * instead of clicking "Add Month" repeatedly. Existing months are left
 * untouched. Returns how many were added alongside the enrollment. */
export async function generateMissingMonths(id) {
  const enrollment = await Enrollment.findById(id).select('registrationDate monthlyFee monthlyPayments');
  if (!enrollment) throw new ApiError(404, 'Enrollment not found');
  if (!enrollment.registrationDate) throw new ApiError(400, 'Set a registration date before generating months');

  const existing = new Set(enrollment.monthlyPayments.map((m) => m.month));
  const start = new Date(enrollment.registrationDate);
  const now = new Date();

  const toAdd = [];
  let year = start.getUTCFullYear();
  let monthIndex = start.getUTCMonth();
  const endYear = now.getUTCFullYear();
  const endMonthIndex = now.getUTCMonth();
  while (year < endYear || (year === endYear && monthIndex <= endMonthIndex)) {
    const key = monthKey(year, monthIndex);
    if (!existing.has(key)) {
      toAdd.push({ month: key, amount: enrollment.monthlyFee, dueDate: dueDateFor(start, year, monthIndex) });
    }
    monthIndex += 1;
    if (monthIndex > 11) {
      monthIndex = 0;
      year += 1;
    }
  }

  if (toAdd.length > 0) {
    await Enrollment.findByIdAndUpdate(id, { $push: { monthlyPayments: { $each: toAdd } } });
  }
  const updated = await populatedEnrollment(id);
  return { enrollment: updated, addedCount: toAdd.length };
}

export async function removeMonthlyEntry(id, monthId) {
  const enrollment = await Enrollment.findByIdAndUpdate(id, { $pull: { monthlyPayments: { _id: monthId } } }, { new: true });
  if (!enrollment) throw new ApiError(404, 'Enrollment not found');
  return populatedEnrollment(id);
}

/** Admin-triggered "please pay" push to the student's own portal — the
 * entire delivery mechanism for a fee reminder, since this app has no
 * email/SMS. Defaults to the earliest unpaid month when none is named,
 * so "Send Reminder" on the fee panel can be a single click without the
 * mentor having to pick which month first. */
export async function sendFeeReminder(id, { month } = {}) {
  const enrollment = await Enrollment.findById(id).populate('courseId', 'title').populate('studentId', 'name').lean();
  if (!enrollment) throw new ApiError(404, 'Enrollment not found');

  const courseName = enrollment.courseId?.title || 'your course';
  let message;

  if (enrollment.feeType === 'monthly') {
    const target = month
      ? enrollment.monthlyPayments.find((m) => m.month === month)
      : enrollment.monthlyPayments.find((m) => !m.paid);
    if (!target) throw new ApiError(409, 'No pending month to remind about — everything is marked paid.');
    const dueBit = target.dueDate ? ` by ${new Date(target.dueDate).toLocaleDateString('en-IN')}` : '';
    message = `Your fee of ₹${target.amount} for ${target.month} (${courseName}) is due${dueBit}. Please pay at your earliest convenience.`;
  } else {
    const paidSoFar = (enrollment.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const remaining = (enrollment.totalFee || 0) - paidSoFar;
    if (remaining <= 0) throw new ApiError(409, 'No pending fee to remind about — the full amount is already paid.');
    message = `You have a pending fee of ₹${remaining} for ${courseName}. Please pay at your earliest convenience.`;
  }

  await createNotification({
    userId: enrollment.studentId._id,
    type: 'fee-reminder',
    title: 'Fee Reminder',
    message,
  });
  return { sent: true };
}
