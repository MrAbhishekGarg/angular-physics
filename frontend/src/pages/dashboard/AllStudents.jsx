import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useStudentsOverview, useStudentStats } from '../../hooks/useEnrollments.js';
import styles from './Dashboard.module.css';

const STATUS_TONE = { pending: 'accent', active: 'success', completed: 'launching', cancelled: 'default' };
const CATEGORY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'purchased', label: 'Purchased' },
  { key: 'not-purchased', label: 'Not Purchased' },
];

export default function AllStudents() {
  const { data: students, loading, error, refetch } = useStudentsOverview();
  const { data: stats } = useStudentStats();
  const [categoryFilter, setCategoryFilter] = useState('all');

  const statsByStudent = new Map((stats || []).map((s) => [s.studentId, s]));

  const visibleStudents = (students || []).filter((s) => {
    if (categoryFilter === 'purchased') return s.hasPurchased;
    if (categoryFilter === 'not-purchased') return !s.hasPurchased;
    return true;
  });

  return (
    <>
      <SEO title="All Students" description="Every registered student, with purchases and test performance." path="/dashboard/mentor/students" />
      <DashboardLayout role="mentor">
        <div className={styles.wrap}>
          <div className={styles.sectionRow}>
            <h1 className={styles.sectionTitle}>All Students</h1>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {CATEGORY_FILTERS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategoryFilter(c.key)}
                  style={{
                    border: '1px solid var(--ap-border)',
                    clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                    padding: '0.25rem 0.7rem',
                    fontSize: '0.8rem',
                    background: categoryFilter === c.key ? 'var(--ap-primary-surface)' : 'transparent',
                    color: categoryFilter === c.key ? '#fff' : 'var(--ap-text)',
                    cursor: 'pointer',
                  }}
                >
                  {c.label}
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
                    <th>Courses</th>
                    <th>Category</th>
                    <th>Tests Given</th>
                    <th>Avg Score</th>
                    <th>Rank</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((s) => {
                    const stat = statsByStudent.get(s._id);
                    return (
                      <tr key={s._id}>
                        <td>
                          {s.name}
                          <br />
                          <span style={{ color: 'var(--ap-text-muted)', fontSize: '0.8rem' }}>{s.email}</span>
                        </td>
                        <td>
                          {s.enrollments.length === 0 ? (
                            <span style={{ color: 'var(--ap-text-muted)', fontSize: '0.85rem' }}>No enrollments yet</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {s.enrollments.map((e) => (
                                <span key={e._id} style={{ fontSize: '0.82rem' }}>
                                  {e.courseId?.title || 'Unknown course'} —{' '}
                                  <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <Badge tone={s.hasPurchased ? 'success' : 'default'}>
                            {s.hasPurchased ? 'Purchased' : 'Not Purchased'}
                          </Badge>
                        </td>
                        <td>{stat?.testsGiven ?? 0}</td>
                        <td>{stat ? `${stat.avgScorePercent}%` : '—'}</td>
                        <td>{stat ? <Badge tone="highlight">#{stat.rank}</Badge> : '—'}</td>
                        <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                        <td>
                          <Button as={Link} to={`/dashboard/mentor/students/${s._id}`} size="sm" variant="ghost">
                            View
                          </Button>
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
