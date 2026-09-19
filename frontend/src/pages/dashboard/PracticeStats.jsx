import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Stat from '../../components/common/Stat.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useAuth } from '../../hooks/useAuth.js';
import { practiceService } from '../../services/practiceService.js';
import { getTrackMeta } from '../../data/examTracks.js';
import styles from './Dashboard.module.css';

export default function PracticeStats() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data, loading, error, refetch } = useFetch(() => practiceService.getAdminStats(), []);
  const [resettingId, setResettingId] = useState('');

  const handleReset = async (studentId, name) => {
    if (!window.confirm(`Reset ${name}'s practice XP, streak, and stats to zero? This can't be undone.`)) return;
    setResettingId(studentId);
    try {
      await practiceService.resetStudent(studentId);
      await refetch();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setResettingId('');
    }
  };

  return (
    <>
      <SEO title="Practice Stats" description="Student practice activity, streaks, and XP." path="/dashboard/mentor/practice-stats" />
      <DashboardLayout role="mentor">
        <div className={styles.wrap}>
          <div className={styles.sectionRow}>
            <h1 className={styles.sectionTitle}>🎮 Practice Stats</h1>
          </div>

          {loading && <Spinner label="Loading practice stats…" />}
          {error && <ErrorState message={error} onRetry={refetch} />}

          {data && (
            <>
              <div className={styles.statRow}>
                <Stat value={data.summary.activeStudents} label="Students Practicing" />
                <Stat value={data.summary.totalSessionsCompleted} label="Sessions Completed" />
                <Stat value={data.summary.totalQuestionsAttempted} label="Questions Attempted" />
                <Stat value={data.summary.totalPracticeAttempts} label="Total Practice Attempts" />
              </div>

              <div style={{ overflowX: 'auto', marginTop: 'var(--ap-space-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--ap-border)' }}>
                      <th style={{ padding: '0.5rem' }}>Student</th>
                      <th style={{ padding: '0.5rem' }}>Track</th>
                      <th style={{ padding: '0.5rem' }}>Level</th>
                      <th style={{ padding: '0.5rem' }}>XP</th>
                      <th style={{ padding: '0.5rem' }}>Streak</th>
                      <th style={{ padding: '0.5rem' }}>Longest Streak</th>
                      <th style={{ padding: '0.5rem' }}>Sessions</th>
                      <th style={{ padding: '0.5rem' }}>Accuracy</th>
                      {isAdmin && <th style={{ padding: '0.5rem' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} style={{ padding: '1rem', color: 'var(--ap-text-muted)' }}>
                          No student has practiced yet.
                        </td>
                      </tr>
                    )}
                    {data.students.map((s) => (
                      <tr key={s.studentId} style={{ borderBottom: '1px solid var(--ap-border)' }}>
                        <td style={{ padding: '0.5rem' }}>
                          <strong>{s.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--ap-text-muted)' }}>{s.email}</div>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          {s.track ? <Badge tone="default">{getTrackMeta(s.track)?.shortLabel || s.track}</Badge> : '—'}
                        </td>
                        <td style={{ padding: '0.5rem' }}>{s.levelInfo.level}</td>
                        <td style={{ padding: '0.5rem' }}>{s.xp}</td>
                        <td style={{ padding: '0.5rem' }}>🔥 {s.currentStreak}</td>
                        <td style={{ padding: '0.5rem' }}>{s.longestStreak}</td>
                        <td style={{ padding: '0.5rem' }}>{s.totalSessionsCompleted}</td>
                        <td style={{ padding: '0.5rem' }}>{s.accuracyPercent}%</td>
                        {isAdmin && (
                          <td style={{ padding: '0.5rem' }}>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={resettingId === s.studentId}
                              onClick={() => handleReset(s.studentId, s.name)}
                            >
                              {resettingId === s.studentId ? 'Resetting…' : 'Reset'}
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
