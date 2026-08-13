import { useState } from 'react';
import { useParams } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Stat from '../../components/common/Stat.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useStudentDetailAnalytics } from '../../hooks/useAnalytics.js';
import { useAuth } from '../../hooks/useAuth.js';
import { testService } from '../../services/testService.js';
import { authService } from '../../services/authService.js';
import { formatPrice } from '../../data/courseFormat.js';
import formStyles from './DashboardForm.module.css';
import dashboardStyles from './Dashboard.module.css';

const STATUS_TONE = { pending: 'accent', active: 'success', completed: 'launching', cancelled: 'default' };

function ResetPasswordForm({ studentId, onDone }) {
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await authService.resetStudentPassword(studentId, newPassword);
      setSuccess(true);
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <label style={{ flex: 1, minWidth: 180 }}>
        New password
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </label>
      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1.4rem', flexWrap: 'wrap' }}>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? 'Saving…' : 'Set Password'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Close
        </Button>
      </div>
      {success && <p style={{ color: 'var(--ap-success)', fontSize: '0.82rem', width: '100%' }}>Password updated — share it with the student directly.</p>}
      {error && <p className={formStyles.errorMsg} style={{ width: '100%' }}>{error}</p>}
    </form>
  );
}

export default function StudentDetail() {
  const { studentId } = useParams();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useStudentDetailAnalytics(studentId);
  const [resetOpen, setResetOpen] = useState(false);
  const canResetAttempts = !user?.restrictedSections?.includes('tests');
  const canResetPassword = user?.canResetPasswords !== false;

  const handleReset = async (attempt) => {
    if (!window.confirm(`Let this student retake "${attempt.testId?.title}"? Their current attempt will be archived, not deleted.`)) return;
    await testService.resetAttempt(attempt._id);
    await refetch();
  };

  return (
    <>
      <SEO title="Student Detail" description="Notes, tests, and analysis for this student." path="/dashboard/mentor" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h1>Student Detail</h1>
            {canResetPassword && (
              <Button size="sm" variant="ghost" onClick={() => setResetOpen((v) => !v)}>
                {resetOpen ? 'Close' : 'Reset Password'}
              </Button>
            )}
          </div>
          {resetOpen && canResetPassword && <ResetPasswordForm studentId={studentId} onDone={() => setResetOpen(false)} />}

            {loading && <Spinner label="Loading…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}

            {data && (
              <>
                <div className={dashboardStyles.statRow}>
                  <Stat value={data.enrollments.length} label="Courses Enrolled" />
                  <Stat value={data.testsAttemptedCount} label="Tests Attempted" />
                  <Stat value={data.averageScorePercent !== null ? `${data.averageScorePercent}%` : '—'} label="Avg Score" />
                  <Stat value={data.purchasedNotes.length} label="Premium Notes Bought" />
                </div>

                <h2 style={{ color: 'var(--ap-primary)' }}>Enrollments</h2>
                {data.enrollments.length === 0 ? (
                  <ErrorState message="No enrollments yet." />
                ) : (
                  <div className={dashboardStyles.tableWrap}>
                    <table className={dashboardStyles.table}>
                      <thead>
                        <tr>
                          <th>Course</th>
                          <th>Status</th>
                          <th>Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.enrollments.map((e) => (
                          <tr key={e._id}>
                            <td>{e.courseId?.title}</td>
                            <td>
                              <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                            </td>
                            <td>{e.status === 'active' || e.status === 'completed' ? `${e.progressPercent}%` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h2 style={{ color: 'var(--ap-primary)' }}>Weak Chapters</h2>
                {data.weakChapters.length === 0 ? (
                  <ErrorState message="Not enough graded attempts yet to identify weak chapters." />
                ) : (
                  <div className={formStyles.card}>
                    {data.weakChapters.map((w) => (
                      <div key={w.chapter} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}>
                        <span>{w.chapter}</span>
                        <span style={{ color: 'var(--ap-text-muted)' }}>{w.mistakes} mistake(s)</span>
                      </div>
                    ))}
                  </div>
                )}

                <h2 style={{ color: 'var(--ap-primary)' }}>Test Attempts</h2>
                {data.attempts.length === 0 ? (
                  <ErrorState message="No test attempts yet." />
                ) : (
                  <div className={dashboardStyles.tableWrap}>
                    <table className={dashboardStyles.table}>
                      <thead>
                        <tr>
                          <th>Test</th>
                          <th>Status</th>
                          <th>Attempts</th>
                          <th>Score</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.attempts.map((a) => (
                          <tr key={a._id}>
                            <td>
                              {a.testId?.title} <Badge tone="default">{a.testId?.kind || 'test'}</Badge>
                            </td>
                            <td>{a.status}</td>
                            <td>
                              <Badge tone={a.attemptCount > 1 ? 'accent' : 'default'}>
                                {a.attemptCount} attempt{a.attemptCount === 1 ? '' : 's'}
                              </Badge>
                            </td>
                            <td>{a.status === 'submitted' ? `${a.score} / ${a.maxScore}` : '—'}</td>
                            <td>
                              {a.status === 'submitted' && canResetAttempts && (
                                <Button size="sm" variant="ghost" onClick={() => handleReset(a)}>
                                  Reset Attempt
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h2 style={{ color: 'var(--ap-primary)' }}>Premium Notes Purchased</h2>
                {data.purchasedNotes.length === 0 ? (
                  <ErrorState message="No premium notes purchased yet." />
                ) : (
                  <div className={formStyles.card}>
                    {data.purchasedNotes.map((n) => (
                      <div key={n._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}>
                        <span>{n.title}</span>
                        <span style={{ color: 'var(--ap-text-muted)' }}>{formatPrice(n.price, n.currency)}</span>
                      </div>
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
