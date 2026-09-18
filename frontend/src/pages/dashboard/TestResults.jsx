import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Stat from '../../components/common/Stat.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useAuth } from '../../hooks/useAuth.js';
import { testService } from '../../services/testService.js';
import AnalyticsChart from '../../components/dashboard/AnalyticsChart.jsx';
import MathText from '../../components/common/MathText.jsx';
import formStyles from './DashboardForm.module.css';
import dashboardStyles from './Dashboard.module.css';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** One question's per-option pick distribution — a horizontal proportional bar per option, correct one marked with an icon (never color alone). */
function OptionDistributionRow({ q }) {
  const total = q.optionCounts.reduce((s, c) => s + c, 0) + q.unattemptedCount;
  return (
    <div style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--ap-border)' }}>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.35rem' }}>
        <strong style={{ fontSize: '0.82rem' }}>Q{q.questionIndex + 1}</strong>
        <span style={{ fontSize: '0.82rem', color: 'var(--ap-text-muted)' }}>
          <MathText text={q.text?.slice(0, 90) || ''} />
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {q.optionCounts.map((count, oi) => {
          const isCorrect = q.correctOptionIndexes.includes(oi);
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
              <span style={{ width: 16, fontWeight: 700 }}>{OPTION_LETTERS[oi]}</span>
              <div style={{ flex: 1, background: 'var(--ap-bg-muted)', borderRadius: 4, height: 14, position: 'relative', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: isCorrect ? 'var(--ap-success, #1fa971)' : 'var(--ap-text-muted)',
                    opacity: isCorrect ? 1 : 0.55,
                    borderRadius: 4,
                  }}
                />
              </div>
              <span style={{ width: 70, color: 'var(--ap-text-muted)' }}>
                {count} {isCorrect ? '✓' : ''}
              </span>
            </div>
          );
        })}
        {q.unattemptedCount > 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--ap-text-muted)' }}>Unattempted: {q.unattemptedCount}</div>
        )}
      </div>
    </div>
  );
}

/** Polls "who's actively taking this test right now" every 7s — a plain heartbeat-based presence, no websockets. */
function useLiveAttempts(testId) {
  const [live, setLive] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      testService
        .getLiveAttempts(testId)
        .then((data) => {
          if (!cancelled) setLive(data);
        })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 7000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [testId]);
  return live;
}

export default function TestResults() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: attempts, loading, error, refetch } = useFetch(() => testService.listAttempts(id), [id]);
  const live = useLiveAttempts(id);
  const { data: attendance, loading: attendanceLoading, error: attendanceError } = useFetch(
    () => testService.getAttendance(id),
    [id]
  );
  const { data: analysis, loading: analysisLoading, error: analysisError } = useFetch(
    () => testService.getQuestionAnalysis(id),
    [id]
  );
  const { data: stats, loading: statsLoading, error: statsError } = useFetch(() => testService.getStatistics(id), [id]);

  const attemptedAnalysis = (analysis || []).filter((q) => q.attemptedCount > 0);
  const leastAttempted = analysis && analysis.length > 0
    ? analysis.reduce((min, q) => (q.attemptedCount < min.attemptedCount ? q : min), analysis[0])
    : null;
  const toughest = attemptedAnalysis.length > 0
    ? attemptedAnalysis.reduce((min, q) => (q.accuracyPercent < min.accuracyPercent ? q : min), attemptedAnalysis[0])
    : null;

  const handleReset = async (attempt) => {
    if (!window.confirm(`Let ${attempt.studentId?.name || 'this student'} retake the test? Their current attempt will be archived, not deleted.`)) return;
    await testService.resetAttempt(attempt._id);
    await refetch();
  };

  const handleDelete = async (attempt) => {
    if (
      !window.confirm(
        `Permanently delete ${attempt.studentId?.name || 'this student'}'s attempt #${attempt.attemptNumber}? This cannot be undone — use "Reset" instead if you just want to let them retake it.`
      )
    )
      return;
    await testService.deleteAttempt(attempt._id);
    await refetch();
  };

  return (
    <>
      <SEO title="Test Results" description="Review student attempts for this test." path="/dashboard/mentor/tests" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 1100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h1>Test Results</h1>
            <Button as="a" href={testService.answerPdfUrl(id)} target="_blank" rel="noopener noreferrer" size="sm" variant="secondary">
              Download Answer Key (PDF)
            </Button>
          </div>

          {live && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                flexWrap: 'wrap',
                padding: '0.6rem 0.9rem',
                border: '1px solid var(--ap-border)',
                borderRadius: 'var(--ap-radius)',
                background: live.length > 0 ? 'color-mix(in srgb, var(--ap-success, #0d9488) 8%, var(--ap-bg))' : 'var(--ap-bg-muted)',
              }}
            >
              <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
                {live.length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: 'var(--ap-success, #0d9488)',
                      opacity: 0.6,
                      animation: 'ap-pulse 1.6s ease-out infinite',
                    }}
                  />
                )}
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: live.length > 0 ? 'var(--ap-success, #0d9488)' : 'var(--ap-text-muted)',
                  }}
                />
              </span>
              <strong style={{ fontSize: '0.85rem' }}>
                {live.length} student{live.length === 1 ? '' : 's'} taking this test right now
              </strong>
              {live.length > 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>{live.map((s) => s.name).join(', ')}</span>
              )}
            </div>
          )}
          <style>{`@keyframes ap-pulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.4); opacity: 0; } }`}</style>

            <h2 style={{ color: 'var(--ap-primary)' }}>Test Statistics</h2>
            {statsLoading && <Spinner label="Loading statistics…" />}
            {statsError && <ErrorState message={statsError} />}
            {stats && !stats.summary && <ErrorState message="No submitted attempts yet — statistics appear once at least one student finishes." />}
            {stats && stats.summary && (
              <>
                <div className={dashboardStyles.statRow} style={{ marginBottom: 'var(--ap-space-md)' }}>
                  <Stat value={stats.summary.count} label="Submitted" />
                  <Stat value={`${stats.summary.average}%`} label="Average" />
                  <Stat value={`${stats.summary.median}%`} label="Median" />
                  <Stat value={`${stats.summary.highest}%`} label="Highest" />
                  <Stat value={`${stats.summary.lowest}%`} label="Lowest" />
                </div>

                <AnalyticsChart
                  title="Score Distribution"
                  type="bar"
                  data={stats.distribution}
                  xKey="label"
                  yKey="count"
                  color="#17b8cf"
                  emptyMessage="No submitted attempts yet."
                />

                {stats.chapterBreakdown.length > 0 && (
                  <>
                    <h3 style={{ color: 'var(--ap-primary)', marginTop: 'var(--ap-space-md)', fontSize: '1rem' }}>
                      Chapter-wise Accuracy (weakest first)
                    </h3>
                    <div className={dashboardStyles.tableWrap}>
                      <table className={dashboardStyles.table}>
                        <thead>
                          <tr>
                            <th>Chapter</th>
                            <th>Attempted</th>
                            <th>Accuracy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.chapterBreakdown.map((c) => (
                            <tr key={c.chapter}>
                              <td>{c.chapter}</td>
                              <td>{c.attempted}</td>
                              <td>
                                {c.accuracyPercent !== null ? (
                                  <Badge tone={c.accuracyPercent < 40 ? 'accent' : 'success'}>{c.accuracyPercent}%</Badge>
                                ) : (
                                  '—'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                <h3 style={{ color: 'var(--ap-primary)', marginTop: 'var(--ap-space-md)', fontSize: '1rem' }}>
                  Per-Question Option Distribution
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)', marginTop: '-0.4rem' }}>
                  Which option every student actually picked, not just correct-vs-wrong — useful for spotting a
                  distractor that's tricking most of the class.
                </p>
                <div className={formStyles.card}>
                  {stats.optionDistribution
                    .filter((q) => q.optionCounts.length > 0)
                    .map((q) => (
                      <OptionDistributionRow key={q.questionIndex} q={q} />
                    ))}
                </div>
              </>
            )}

            <h2 style={{ color: 'var(--ap-primary)', marginTop: 'var(--ap-space-md)' }}>Attendance</h2>
            {attendanceLoading && <Spinner label="Loading attendance…" />}
            {attendanceError && <ErrorState message={attendanceError} />}
            {attendance && attendance.length === 0 && <ErrorState message="No eligible students for this test yet." />}
            {attendance && attendance.length > 0 && (
              <div className={dashboardStyles.tableWrap}>
                <table className={dashboardStyles.table}>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Attempted</th>
                      <th>Status</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((s) => (
                      <tr key={s.studentId}>
                        <td>
                          {s.name}
                          <br />
                          <span style={{ color: 'var(--ap-text-muted)', fontSize: '0.8rem' }}>{s.email}</span>
                        </td>
                        <td>
                          {s.attempted ? (
                            <Badge tone="success">Attempted</Badge>
                          ) : (
                            <Badge tone="accent">Not Attempted</Badge>
                          )}
                        </td>
                        <td>{s.status || '—'}</td>
                        <td>{s.score !== null && s.score !== undefined ? `${s.score} / ${s.maxScore}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h2 style={{ color: 'var(--ap-primary)', marginTop: 'var(--ap-space-md)' }}>Question Analysis</h2>
            {analysisLoading && <Spinner label="Loading question analysis…" />}
            {analysisError && <ErrorState message={analysisError} />}
            {analysis && analysis.length === 0 && <ErrorState message="This test has no questions yet." />}
            {analysis && analysis.length > 0 && (
              <>
                <div className={dashboardStyles.statRow} style={{ marginBottom: 'var(--ap-space-md)' }}>
                  {leastAttempted && (
                    <Stat
                      value={`Q${leastAttempted.questionIndex + 1}`}
                      label={`Least Attempted (${leastAttempted.attemptedCount}/${leastAttempted.totalStudents})`}
                    />
                  )}
                  {toughest && (
                    <Stat
                      value={`Q${toughest.questionIndex + 1}`}
                      label={`Toughest (${toughest.accuracyPercent}% accuracy)`}
                    />
                  )}
                </div>
                <div className={dashboardStyles.tableWrap}>
                  <table className={dashboardStyles.table}>
                    <thead>
                      <tr>
                        <th>Question</th>
                        <th>Attempted</th>
                        <th>Correct</th>
                        <th>Wrong</th>
                        <th>Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.map((q) => (
                        <tr key={q.questionIndex}>
                          <td>
                            Q{q.questionIndex + 1}
                            <br />
                            <span style={{ color: 'var(--ap-text-muted)', fontSize: '0.8rem' }}>
                              {q.text.slice(0, 80)}
                            </span>
                          </td>
                          <td>
                            {q.attemptedCount} / {q.totalStudents}
                          </td>
                          <td>{q.correctCount}</td>
                          <td>{q.wrongCount}</td>
                          <td>
                            {q.accuracyPercent !== null ? (
                              <Badge tone={q.accuracyPercent < 40 ? 'accent' : 'success'}>{q.accuracyPercent}%</Badge>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <h2 style={{ color: 'var(--ap-primary)', marginTop: 'var(--ap-space-md)' }}>Attempts</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--ap-text-muted)', marginTop: '-0.3rem' }}>
              Every attempt is listed, including past ones from a reset retake — resetting archives an attempt, it
              never deletes it, so full history and mistakes stay visible below.
            </p>
            {loading && <Spinner label="Loading results…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}

            {attempts && attempts.length === 0 && <ErrorState message="No attempts yet." />}

            {attempts && attempts.length > 0 && (
              <div className={dashboardStyles.tableWrap}>
                <table className={dashboardStyles.table}>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Attempt</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Correct / Wrong / Unattempted</th>
                      <th>Proctoring</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a) => (
                      <tr key={a._id} style={a.isCurrent ? undefined : { opacity: 0.75 }}>
                        <td>
                          {a.studentId?.name}
                          <br />
                          <span style={{ color: 'var(--ap-text-muted)', fontSize: '0.8rem' }}>{a.studentId?.email}</span>
                        </td>
                        <td>
                          <Badge tone={a.isCurrent ? 'default' : 'launching'}>
                            #{a.attemptNumber} of {a.attemptCount}
                          </Badge>
                          {!a.isCurrent && (
                            <>
                              <br />
                              <span style={{ fontSize: '0.75rem', color: 'var(--ap-text-muted)' }}>archived (reset)</span>
                            </>
                          )}
                        </td>
                        <td>{a.status}</td>
                        <td>
                          {a.status === 'submitted' ? `${a.score} / ${a.maxScore}` : '—'}
                        </td>
                        <td>
                          {a.status === 'submitted' ? `${a.correctCount} / ${a.wrongCount} / ${a.unattemptedCount}` : '—'}
                        </td>
                        <td>
                          {a.proctoring?.flagged ? (
                            <Badge tone="accent">
                              Flagged ({a.proctoring.tabSwitchCount} switches, {a.proctoring.fullscreenExitCount} exits)
                            </Badge>
                          ) : (
                            <Badge tone="success">Clean</Badge>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {a.status === 'submitted' && (
                              <Button as={Link} to={`/dashboard/mentor/tests/attempts/${a._id}/result`} size="sm" variant="ghost">
                                Full Report
                              </Button>
                            )}
                            {a.isCurrent && a.status === 'submitted' && (
                              <Button size="sm" variant="ghost" onClick={() => handleReset(a)}>
                                Reset Attempt
                              </Button>
                            )}
                            {isAdmin && (
                              <Button size="sm" variant="danger" onClick={() => handleDelete(a)}>
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
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
