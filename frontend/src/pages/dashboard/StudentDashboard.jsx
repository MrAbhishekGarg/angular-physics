import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import Stat from '../../components/common/Stat.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EnrollmentCard from '../../components/dashboard/EnrollmentCard.jsx';
import RecommendationPanel from '../../components/dashboard/RecommendationPanel.jsx';
import { useStudentAnalytics } from '../../hooks/useAnalytics.js';
import { useAuth } from '../../hooks/useAuth.js';
import styles from './Dashboard.module.css';

const NEW_CONTENT_LABEL = { test: 'Test', dpp: 'DPP', assignment: 'Assignment', video: 'Video Lecture', note: 'Notes' };

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useStudentAnalytics();

  return (
    <>
      <SEO title="Student Dashboard" description="Track your enrolled courses and progress." path="/dashboard/student" />
      <DashboardLayout role="student">
        <div className={styles.wrap}>
          <SectionHeading align="left" eyebrow="Student Dashboard" title={`Welcome back, ${user?.name}`} />

            {loading && <Spinner label="Loading your dashboard…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}

            <RecommendationPanel />

            {data && data.newContent.length > 0 && (
              <>
                <div className={styles.sectionRow}>
                  <h2 className={styles.sectionTitle}>🔔 New for You</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: 'var(--ap-space-lg)' }}>
                  {data.newContent.map((item, i) => (
                    <Link
                      key={i}
                      to={item.link}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.6rem 0.9rem',
                        border: '1px solid var(--ap-border)',
                        borderRadius: 'var(--ap-radius)',
                        background: 'var(--ap-bg)',
                        textDecoration: 'none',
                        color: 'var(--ap-text)',
                      }}
                    >
                      {item.type === 'test' && item.attempted ? (
                        <Badge tone="default">Already Attempted</Badge>
                      ) : (
                        <Badge tone="highlight">{NEW_CONTENT_LABEL[item.type] || 'New'}</Badge>
                      )}
                      <span>{item.title}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--ap-text-muted)' }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {data && (
              <>
                <div className={styles.statRow}>
                  <Stat value={data.enrolledCount} label="Courses Enrolled" />
                  <Stat value={data.activeCount} label="Active" />
                  <Stat value={data.completedCount} label="Completed" />
                  <Stat value={data.leadsSubmittedCount} label="Enquiries Sent" />
                </div>

                <div className={styles.sectionRow}>
                  <h2 className={styles.sectionTitle}>Your Courses</h2>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Button as={Link} to="/courses" variant="ghost" size="sm">
                      Browse More Courses
                    </Button>
                  </div>
                </div>

                {data.enrollments.length === 0 ? (
                  <ErrorState message="You haven't enrolled in any courses yet." />
                ) : (
                  <div className={styles.grid}>
                    {data.enrollments.map((enrollment) => (
                      <EnrollmentCard key={enrollment._id} enrollment={enrollment} />
                    ))}
                  </div>
                )}
              </>
            )}
        </div>
      </DashboardLayout>
    </>
  );
}
