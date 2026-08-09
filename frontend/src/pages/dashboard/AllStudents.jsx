import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useAllEnrollments, useStudentStats } from '../../hooks/useEnrollments.js';
import styles from './Dashboard.module.css';

const STATUS_TONE = { pending: 'accent', active: 'success', completed: 'launching', cancelled: 'default' };
const STATUS_FILTERS = ['all', 'pending', 'active', 'completed', 'cancelled'];

export default function AllStudents() {
  const { data: enrollments, loading, error, refetch } = useAllEnrollments();
  const { data: stats } = useStudentStats();
  const [statusFilter, setStatusFilter] = useState('all');

  const statsByStudent = new Map((stats || []).map((s) => [s.studentId, s]));

  const visibleStudents =
    statusFilter === 'all' ? enrollments || [] : (enrollments || []).filter((e) => e.status === statusFilter);

  return (
    <>
      <SEO title="All Students" description="Every enrolled student, with test performance and rank." path="/dashboard/mentor/students" />
      <DashboardLayout role="mentor">
        <div className={styles.wrap}>
          <div className={styles.sectionRow}>
            <h1 className={styles.sectionTitle}>All Students</h1>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  style={{
                    border: '1px solid var(--ap-border)',
                    clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                    padding: '0.25rem 0.7rem',
                    fontSize: '0.8rem',
                    background: statusFilter === s ? 'var(--ap-primary-surface)' : 'transparent',
                    color: statusFilter === s ? '#fff' : 'var(--ap-text)',
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {loading && <Spinner label="Loading students…" />}
          {error && <ErrorState message={error} onRetry={refetch} />}

          {!loading && visibleStudents.length === 0 && <ErrorState message="No students in this category." />}

          {visibleStudents.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Tests Given</th>
                    <th>Avg Score</th>
                    <th>Rank</th>
                    <th>Enrolled</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((e) => {
                    const stat = e.studentId?._id ? statsByStudent.get(e.studentId._id) : null;
                    return (
                      <tr key={e._id}>
                        <td>
                          {e.studentId?.name}
                          <br />
                          <span style={{ color: 'var(--ap-text-muted)', fontSize: '0.8rem' }}>
                            {e.studentId?.email}
                          </span>
                        </td>
                        <td>{e.courseId?.title}</td>
                        <td>
                          <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                        </td>
                        <td>{e.status === 'active' || e.status === 'completed' ? `${e.progressPercent}%` : '—'}</td>
                        <td>{stat?.testsGiven ?? 0}</td>
                        <td>{stat ? `${stat.avgScorePercent}%` : '—'}</td>
                        <td>{stat ? <Badge tone="highlight">#{stat.rank}</Badge> : '—'}</td>
                        <td>{new Date(e.createdAt).toLocaleDateString()}</td>
                        <td>
                          {e.studentId?._id && (
                            <Button as={Link} to={`/dashboard/mentor/students/${e.studentId._id}`} size="sm" variant="ghost">
                              View
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
