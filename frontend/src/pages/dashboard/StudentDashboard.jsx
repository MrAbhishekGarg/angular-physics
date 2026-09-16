import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import Stat from '../../components/common/Stat.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EnrollmentCard from '../../components/dashboard/EnrollmentCard.jsx';
import RecommendationPanel from '../../components/dashboard/RecommendationPanel.jsx';
import { useStudentAnalytics } from '../../hooks/useAnalytics.js';
import { useAuth } from '../../hooks/useAuth.js';
import styles from './Dashboard.module.css';

const NEW_CONTENT_LABEL = { test: 'Test', dpp: 'DPP', assignment: 'Assignment', video: 'Video Lecture', note: 'Notes' };

/** Read-only fee/due status for one live-course enrollment — the mentor/
 * admin sets these terms and marks payments from StudentDetail.jsx; this
 * is purely a view so the student can see what they owe and what's paid. */
function FeeStatusCard({ enrollment }) {
  const unpaidMonths = (enrollment.monthlyPayments || []).filter((m) => !m.paid);
  const totalPaidOneTime = (enrollment.payments || []).reduce((sum, p) => sum + p.amount, 0);

  return (
    <div style={{ border: '1px solid var(--ap-border)', borderRadius: 'var(--ap-radius)', padding: '0.9rem', background: 'var(--ap-bg)' }}>
      <strong>{enrollment.courseId?.title}</strong>

      {enrollment.feeType === 'monthly' ? (
        <>
          <p style={{ fontSize: '0.85rem', margin: '0.4rem 0' }}>Monthly fee: ₹{enrollment.monthlyFee}</p>
          {(enrollment.monthlyPayments || []).length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--ap-text-muted)' }}>No billing cycles recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {enrollment.monthlyPayments.map((m) => (
                <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>
                    {m.month} — ₹{m.amount} {m.dueDate ? `· due ${new Date(m.dueDate).toLocaleDateString('en-IN')}` : ''}
                  </span>
                  <Badge tone={m.paid ? 'success' : 'accent'}>{m.paid ? 'Paid' : 'Due'}</Badge>
                </div>
              ))}
            </div>
          )}
          {unpaidMonths.length > 0 && (
            <p style={{ fontSize: '0.82rem', color: 'var(--ap-warning)', marginTop: '0.4rem' }}>
              {unpaidMonths.length} month{unpaidMonths.length === 1 ? '' : 's'} due — contact your mentor/admin to pay.
            </p>
          )}
        </>
      ) : (
        <p style={{ fontSize: '0.85rem', margin: '0.4rem 0' }}>
          Paid so far: ₹{totalPaidOneTime} of ₹{enrollment.totalFee || 0}
        </p>
      )}

      {enrollment.securityAmount > 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)', marginTop: '0.4rem' }}>
          Security deposit: ₹{enrollment.securityPaid || 0} paid of ₹{enrollment.securityAmount}
        </p>
      )}
    </div>
  );
}

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

                {data.enrollments.some((e) => e.courseId?.courseType === 'live' && e.feeType) && (
                  <>
                    <div className={styles.sectionRow}>
                      <h2 className={styles.sectionTitle}>My Fees</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {data.enrollments
                        .filter((e) => e.courseId?.courseType === 'live' && e.feeType)
                        .map((e) => (
                          <FeeStatusCard key={e._id} enrollment={e} />
                        ))}
                    </div>
                  </>
                )}
              </>
            )}
        </div>
      </DashboardLayout>
    </>
  );
}
