import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Lead from '../models/Lead.js';
import Testimonial from '../models/Testimonial.js';

export async function getMentorAnalytics() {
  const [
    totalStudentIds,
    totalEnrollments,
    pendingCount,
    enrollmentsByCourseRaw,
    revenueRaw,
    totalLeads,
    recentLeads,
    leadsOverTimeRaw,
    testimonialsCount,
  ] = await Promise.all([
    Enrollment.distinct('studentId'),
    Enrollment.countDocuments(),
    Enrollment.countDocuments({ status: 'pending' }),
    Enrollment.aggregate([
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
      { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
      { $unwind: '$course' },
      { $project: { _id: 0, courseId: '$_id', title: '$course.title', track: '$course.track', count: 1 } },
    ]),
    Enrollment.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'course' } },
      { $unwind: '$course' },
      { $group: { _id: null, total: { $sum: '$course.price' } } },
    ]),
    Lead.countDocuments(),
    Lead.find().sort({ createdAt: -1 }).limit(10).lean(),
    Lead.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Testimonial.countDocuments(),
  ]);

  const enrollmentsByTrack = Object.values(
    enrollmentsByCourseRaw.reduce((acc, row) => {
      acc[row.track] = acc[row.track] || { track: row.track, count: 0 };
      acc[row.track].count += row.count;
      return acc;
    }, {})
  );

  return {
    totalStudents: totalStudentIds.length,
    totalEnrollments,
    pendingCount,
    enrollmentsByCourse: enrollmentsByCourseRaw,
    enrollmentsByTrack,
    revenueEstimate: revenueRaw[0]?.total || 0,
    totalLeads,
    recentLeads,
    leadsOverTime: leadsOverTimeRaw.map((r) => ({ date: r._id, count: r.count })),
    testimonialsCount,
    totalCourses: await Course.countDocuments(),
  };
}

export async function getStudentAnalytics(studentId, email) {
  const [enrollments, leadsSubmittedCount] = await Promise.all([
    Enrollment.find({ studentId })
      .populate('courseId', 'title slug track price durationWeeks status imageUrl')
      .sort({ createdAt: -1 })
      .lean(),
    Lead.countDocuments({ email }),
  ]);

  return {
    enrollments,
    enrolledCount: enrollments.length,
    activeCount: enrollments.filter((e) => e.status === 'active').length,
    completedCount: enrollments.filter((e) => e.status === 'completed').length,
    leadsSubmittedCount,
  };
}
