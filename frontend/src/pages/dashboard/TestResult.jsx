import { Link, useParams } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import Container from '../../components/common/Container.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useAuth, isMentorRole } from '../../hooks/useAuth.js';
import { testService } from '../../services/testService.js';
import { assetUrl } from '../../data/assetUrl.js';
import styles from './TestResult.module.css';

function questionOutcome(question, answer) {
  if (question.type === 'numerical') {
    if (answer?.numericAnswer === undefined || answer?.numericAnswer === null) return 'unattempted';
    const diff = Math.abs(answer.numericAnswer - question.correctNumericAnswer);
    return diff <= (question.numericTolerance || 0) ? 'correct' : 'wrong';
  }
  const selected = answer?.selectedOptionIndexes || [];
  if (selected.length === 0) return 'unattempted';
  const correct = new Set(question.correctOptionIndexes || []);
  const hasWrong = selected.some((i) => !correct.has(i));
  if (hasWrong) return 'wrong';
  return selected.length === correct.size ? 'correct' : 'partial';
}

const OUTCOME_META = {
  correct: { label: 'Correct', icon: '✓', badgeClass: 'outcomeCorrect' },
  wrong: { label: 'Wrong', icon: '✗', badgeClass: 'outcomeWrong' },
  partial: { label: 'Partial', icon: '±', badgeClass: 'outcomePartial' },
  unattempted: { label: 'Unattempted', icon: '➖', badgeClass: 'outcomeUnattempted' },
};

export default function TestResult() {
  const { attemptId } = useParams();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useFetch(() => testService.getResult(attemptId), [attemptId]);
  const backToResultsPath = isMentorRole(user?.role) ? '/dashboard/mentor/tests' : '/dashboard/student/tests/history';

  if (loading) return <Spinner label="Loading result…" />;
  if (error) {
    return (
      <main>
        <Container>
          <div className={styles.wrap}>
            <ErrorState message={error} onRetry={refetch} />
          </div>
        </Container>
      </main>
    );
  }
  if (!data) return null;

  const { test, attempt, rank, totalAttempts } = data;
  const rawPercent = attempt.maxScore > 0 ? (attempt.score / attempt.maxScore) * 100 : 0;
  const ringPercent = Math.min(100, Math.max(0, Math.round(rawPercent)));

  return (
    <>
      <SEO title="Test Result" description="Your test result and answer review." path="/dashboard/student/tests" />
      <main>
        <Container>
          <div className={styles.wrap}>
            <Link to={backToResultsPath}>← Back to {isMentorRole(user?.role) ? 'tests' : 'results'}</Link>
            <h1 className={styles.title}>{test.title}</h1>

            <div className={styles.summary}>
              <div className={styles.ring} style={{ background: `conic-gradient(var(--ap-accent) ${ringPercent}%, var(--ap-bg-muted) 0)` }}>
                <div className={styles.ringHole}>
                  <span className={styles.ringPercent}>{ringPercent}%</span>
                  <span className={styles.ringLabel}>Score</span>
                </div>
              </div>

              <div className={styles.pills}>
                <div className={`${styles.pill} ${styles.pillScore}`}>
                  <div className={styles.pillValue}>
                    {attempt.score} / {attempt.maxScore}
                  </div>
                  <div className={styles.pillLabel}>Total Score</div>
                </div>
                <div className={`${styles.pill} ${styles.pillCorrect}`}>
                  <div className={styles.pillValue}>{attempt.correctCount}</div>
                  <div className={styles.pillLabel}>Correct</div>
                </div>
                <div className={`${styles.pill} ${styles.pillWrong}`}>
                  <div className={styles.pillValue}>{attempt.wrongCount}</div>
                  <div className={styles.pillLabel}>Wrong</div>
                </div>
                <div className={`${styles.pill} ${styles.pillUnattempted}`}>
                  <div className={styles.pillValue}>{attempt.unattemptedCount}</div>
                  <div className={styles.pillLabel}>Unattempted</div>
                </div>
                {rank && totalAttempts > 1 && (
                  <div className={`${styles.pill} ${styles.pillRank}`}>
                    <div className={styles.pillValue}>
                      #{rank} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>/ {totalAttempts}</span>
                    </div>
                    <div className={styles.pillLabel}>Your Rank</div>
                  </div>
                )}
              </div>
            </div>

            {attempt.proctoring?.flagged && (
              <p className={styles.flagged}>
                This attempt was flagged for proctoring violations and may be reviewed by your mentor.
              </p>
            )}

            <h2 className={styles.reviewHeading}>Answer Review</h2>
            {test.questions.map((q, index) => {
              const answer = attempt.answers.find((a) => a.questionIndex === index);
              const outcome = questionOutcome(q, answer);
              const meta = OUTCOME_META[outcome];
              const section = (test.sections || []).find((s) => s.startIndex === index);

              return (
                <div key={index}>
                  {section && (
                    <h3 className={styles.sectionHeading}>
                      {section.name}
                      {section.instructions && <span className={styles.sectionHeadingInstructions}> — {section.instructions}</span>}
                    </h3>
                  )}
                  <div className={styles.qCard}>
                  <div className={styles.qHeader}>
                    <span className={styles.qNumber}>Question {index + 1}</span>
                    <span className={`${styles.outcomeBadge} ${styles[meta.badgeClass]}`}>
                      {meta.icon} {meta.label}
                    </span>
                  </div>

                  {q.text?.trim() && <p className={styles.stemText}>{q.text}</p>}
                  {q.imageUrl && <img src={assetUrl(q.imageUrl)} alt={q.text} className={styles.stemImage} />}

                  {q.type === 'numerical' ? (
                    <div className={styles.numericAnswer}>
                      <span>Your answer: <strong>{answer?.numericAnswer ?? '—'}</strong></span>
                      <span>Correct: <strong>{q.correctNumericAnswer}</strong></span>
                    </div>
                  ) : (
                    <table className={styles.optionsTable}>
                      <thead>
                        <tr>
                          <th>Option</th>
                          <th>Your Answer</th>
                          <th>Correct?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {q.options.map((opt, optIndex) => {
                          const isCorrect = q.correctOptionIndexes.includes(optIndex);
                          const isSelected = (answer?.selectedOptionIndexes || []).includes(optIndex);
                          return (
                            <tr
                              key={optIndex}
                              className={`${styles.optionRow} ${
                                isCorrect ? styles.optionCorrect : isSelected ? styles.optionWrong : ''
                              }`}
                            >
                              <td className={styles.optionTextCell}>
                                <span className={`${styles.optionLetter} ${styles[`letter${optIndex % 6}`]}`}>
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                {opt.text?.trim() && <span className={styles.optionText}>{opt.text}</span>}
                                {opt.imageUrl && <img src={assetUrl(opt.imageUrl)} alt={opt.text} className={styles.optionImage} />}
                              </td>
                              <td className={styles.optionCenterCell}>
                                {isSelected ? <span className={styles.optionIcon}>●</span> : '—'}
                              </td>
                              <td className={styles.optionCenterCell}>
                                {isCorrect ? <span className={styles.optionIcon}>✓</span> : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </main>
    </>
  );
}
