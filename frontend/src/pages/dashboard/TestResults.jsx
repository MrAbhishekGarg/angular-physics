import { useParams } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Stat from '../../components/common/Stat.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { testService } from '../../services/testService.js';
import formStyles from './DashboardForm.module.css';
import dashboardStyles from './Dashboard.module.css';

export default function TestResults() {
  const { id } = useParams();
  const { data: attempts, loading, error, refetch } = useFetch(() => testService.listAttempts(id), [id]);
  const { data: attendance, loading: attendanceLoading, error: attendanceError } = useFetch(
    () => testService.getAttendance(id),
    [id]
  );
  const { data: analysis, loading: analysisLoading, error: analysisError } = useFetch(
    () => testService.getQuestionAnalysis(id),
    [id]
  );

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

            <h2 style={{ color: 'var(--ap-primary)' }}>Attendance</h2>
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
            {loading && <Spinner label="Loading results…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}

            {attempts && attempts.length === 0 && <ErrorState message="No attempts yet." />}

            {attempts && attempts.length > 0 && (
              <div className={dashboardStyles.tableWrap}>
                <table className={dashboardStyles.table}>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Status</th>
                      <th>Attempts</th>
                      <th>Score</th>
                      <th>Correct / Wrong / Unattempted</th>
                      <th>Proctoring</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a) => (
                      <tr key={a._id}>
                        <td>
                          {a.studentId?.name}
                          <br />
                          <span style={{ color: 'var(--ap-text-muted)', fontSize: '0.8rem' }}>{a.studentId?.email}</span>
                        </td>
                        <td>{a.status}</td>
                        <td>
                          <Badge tone={a.attemptCount > 1 ? 'accent' : 'default'}>
                            {a.attemptCount} attempt{a.attemptCount === 1 ? '' : 's'}
                          </Badge>
                        </td>
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
                          {a.status === 'submitted' && (
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
        </div>
      </DashboardLayout>
    </>
  );
}
