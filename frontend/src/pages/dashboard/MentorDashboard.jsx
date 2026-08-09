import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import Stat from '../../components/common/Stat.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import AnalyticsChart from '../../components/dashboard/AnalyticsChart.jsx';
import CourseManageRow from '../../components/dashboard/CourseManageRow.jsx';
import { useMentorAnalytics } from '../../hooks/useAnalytics.js';
import { useAllEnrollments } from '../../hooks/useEnrollments.js';
import { useCourses } from '../../hooks/useCourses.js';
import { enrollmentService } from '../../services/enrollmentService.js';
import { courseService } from '../../services/courseService.js';
import { formatPrice } from '../../data/courseFormat.js';
import styles from './Dashboard.module.css';

export default function MentorDashboard() {
  const { data: analytics, loading, error, refetch: refetchAnalytics } = useMentorAnalytics();
  const { data: enrollments, refetch: refetchEnrollments } = useAllEnrollments();
  const { data: courses, refetch: refetchCourses } = useCourses();
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const pending = (enrollments || []).filter((e) => e.status === 'pending');

  const handleDecision = async (id, status) => {
    setBusyId(id);
    setActionError('');
    try {
      await enrollmentService.update(id, { status });
      await Promise.all([refetchEnrollments(), refetchAnalytics()]);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteCourse = async (course) => {
    if (!window.confirm(`Delete "${course.title}"? This can't be undone.`)) return;
    setActionError('');
    try {
      await courseService.remove(course._id);
      await refetchCourses();
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <>
      <SEO title="Mentor Dashboard" description="Manage courses and view analytics." path="/dashboard/mentor" />
      <DashboardLayout role="mentor">
        <div className={styles.wrap}>
          <SectionHeading align="left" eyebrow="Mentor Dashboard" title="Your business at a glance" />

            {loading && <Spinner label="Loading analytics…" />}
            {error && <ErrorState message={error} onRetry={refetchAnalytics} />}

            {analytics && (
              <>
                <div className={styles.statRow}>
                  <Stat value={analytics.totalStudents} label="Total Students" />
                  <Stat value={analytics.totalEnrollments} label="Total Enrollments" />
                  <Stat value={analytics.pendingCount} label="Pending Approval" />
                  <Stat value={formatPrice(analytics.revenueEstimate)} label="Est. Revenue" />
                  <Stat value={analytics.totalLeads} label="Total Leads" />
                  <Stat value={analytics.testimonialsCount} label="Testimonials" />
                </div>

                <div className={styles.chartsRow}>
                  <AnalyticsChart
                    title="Enrollments by Track"
                    type="bar"
                    data={analytics.enrollmentsByTrack}
                    xKey="track"
                    yKey="count"
                    color="#1b3a6b"
                    emptyMessage="No enrollments yet."
                  />
                  <AnalyticsChart
                    title="Leads — Last 30 Days"
                    type="area"
                    data={analytics.leadsOverTime}
                    xKey="date"
                    yKey="count"
                    color="#17b8cf"
                    emptyMessage="No leads in the last 30 days."
                  />
                </div>
              </>
            )}

            {actionError && <p style={{ color: 'var(--ap-danger)', marginBottom: '1rem' }}>{actionError}</p>}

            <div className={styles.sectionRow}>
              <h2 className={styles.sectionTitle}>Pending Enrollment Requests</h2>
            </div>
            {pending.length === 0 ? (
              <ErrorState message="No pending requests." />
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Requested</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((e) => (
                      <tr key={e._id}>
                        <td>
                          {e.studentId?.name}
                          <br />
                          <span style={{ color: 'var(--ap-text-muted)', fontSize: '0.8rem' }}>
                            {e.studentId?.email}
                          </span>
                        </td>
                        <td>{e.courseId?.title}</td>
                        <td>{new Date(e.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className={styles.actionRow}>
                            <Button
                              size="sm"
                              disabled={busyId === e._id}
                              onClick={() => handleDecision(e._id, 'active')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busyId === e._id}
                              onClick={() => handleDecision(e._id, 'cancelled')}
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {analytics && (
              <>
                <div className={styles.sectionRow}>
                  <h2 className={styles.sectionTitle}>Recent Leads</h2>
                </div>
                {analytics.recentLeads.length === 0 ? (
                  <ErrorState message="No leads yet." />
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Course</th>
                          <th>Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.recentLeads.map((lead) => (
                          <tr key={lead._id}>
                            <td>{lead.name}</td>
                            <td>{lead.email}</td>
                            <td>{lead.courseSlug || '—'}</td>
                            <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            <div className={styles.sectionRow}>
              <h2 className={styles.sectionTitle}>Manage Courses</h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {analytics?.openDoubtsCount > 0 && (
                  <Button as={Link} to="/dashboard/mentor/doubts" variant="ghost" size="sm">
                    {analytics.openDoubtsCount} Open Doubt{analytics.openDoubtsCount === 1 ? '' : 's'}
                  </Button>
                )}
                <Button as={Link} to="/dashboard/mentor/courses/new" size="sm">
                  + Add New Course
                </Button>
              </div>
            </div>
            {!courses ? (
              <Spinner label="Loading courses…" />
            ) : courses.length === 0 ? (
              <ErrorState message="No courses yet — add your first one." />
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Track</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => (
                      <CourseManageRow key={course._id} course={course} onDelete={handleDeleteCourse} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </DashboardLayout>
    </>
  );
}
