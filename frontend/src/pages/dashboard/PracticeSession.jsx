import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import MathText from '../../components/common/MathText.jsx';
import { testService } from '../../services/testService.js';
import { assetUrl } from '../../data/assetUrl.js';
import formStyles from './DashboardForm.module.css';
import styles from './PracticeSession.module.css';

function hasRealAnswer(answer) {
  if (!answer) return false;
  if (answer.selectedOptionIndexes && answer.selectedOptionIndexes.length > 0) return true;
  return answer.numericAnswer !== undefined && answer.numericAnswer !== null;
}

/**
 * A deliberately different, calmer experience from TestAttempt.jsx — no
 * fullscreen takeover, no proctoring, no countdown clock, never called a
 * "test" on screen. Practice sessions are still backed by the exact same
 * Test/TestAttempt/submit machinery (kind:'practice'), just presented the
 * way the PDF-extraction review screen felt: one calm card, a numbered
 * palette to jump around, math rendered inline.
 */
export default function PracticeSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', test: null, attempt: null });
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    testService
      .start(id)
      .then(({ test, attempt }) => {
        setState({ loading: false, error: '', test, attempt });
        const restored = {};
        (attempt.answers || []).forEach((a) => {
          restored[a.questionIndex] = a;
        });
        setAnswers(restored);
      })
      .catch((err) => setState({ loading: false, error: err.message, test: null, attempt: null }));
  }, [id]);

  // Same debounced-autosave pattern as TestAttempt.jsx, minus the
  // sendBeacon/ping additions — practice sessions aren't tracked for live
  // presence and a lost autosave here just costs one un-saved answer, not a
  // graded exam.
  useEffect(() => {
    if (!state.attempt || submitting) return;
    const timer = setTimeout(() => {
      const answersArray = Object.entries(answers).map(([questionIndex, a]) => ({
        questionIndex: Number(questionIndex),
        ...a,
      }));
      testService.saveProgress(state.attempt._id, { answers: answersArray }).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [answers, state.attempt, submitting]);

  const submittingRef = useRef(false);
  const handleFinish = async () => {
    if (submittingRef.current || !state.attempt) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const answersArray = Object.entries(answers).map(([questionIndex, a]) => ({
        questionIndex: Number(questionIndex),
        ...a,
      }));
      await testService.submit(state.attempt._id, { answers: answersArray });
      navigate(`/dashboard/student/tests/attempts/${state.attempt._id}/result`);
    } catch (err) {
      submittingRef.current = false;
      setSubmitting(false);
      setState((s) => ({ ...s, error: err.message }));
    }
  };

  if (state.loading) {
    return (
      <DashboardLayout role="student">
        <Spinner label="Setting up your practice set…" />
      </DashboardLayout>
    );
  }
  if (state.error) {
    return (
      <DashboardLayout role="student">
        <div className={formStyles.wrap}>
          <ErrorState message={state.error} />
        </div>
      </DashboardLayout>
    );
  }

  const { test } = state;
  const questions = test.questions;
  const question = questions[currentIndex];
  const answer = answers[currentIndex] || {};
  const answeredCount = questions.filter((_, i) => hasRealAnswer(answers[i])).length;

  const setAnswer = (patch) => setAnswers((a) => ({ ...a, [currentIndex]: { ...a[currentIndex], ...patch } }));

  const toggleOption = (optIndex) => {
    if (question.type === 'mcq-single') {
      setAnswer({ selectedOptionIndexes: [optIndex] });
      return;
    }
    const current = answer.selectedOptionIndexes || [];
    setAnswer({
      selectedOptionIndexes: current.includes(optIndex) ? current.filter((i) => i !== optIndex) : [...current, optIndex],
    });
  };

  const isLast = currentIndex === questions.length - 1;

  return (
    <>
      <SEO title="Practice" description="Untimed physics practice." path="/dashboard/student/practice" />
      <DashboardLayout role="student">
        <div className={`${formStyles.wrap} ${styles.wrap}`}>
          <div className={styles.topRow}>
            <div>
              <h1 style={{ margin: 0 }}>🎯 {test.title}</h1>
              <p style={{ color: 'var(--ap-text-muted)', margin: '0.25rem 0 0' }}>
                Untimed practice — answer at your own pace, jump between questions freely.
              </p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={handleFinish} disabled={submitting}>
              {submitting ? 'Finishing…' : '🏁 Finish Practice'}
            </Button>
          </div>

          <div className={styles.stage}>
            <div className={styles.palette}>
              <span className={styles.paletteLabel}>
                {answeredCount} / {questions.length} answered
              </span>
              <div className={styles.pgrid}>
                {questions.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.chip} ${hasRealAnswer(answers[i]) ? styles.chipAnswered : ''} ${
                      i === currentIndex ? styles.chipActive : ''
                    }`}
                    onClick={() => setCurrentIndex(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.qmeta}>
                <strong>Question {currentIndex + 1}</strong>
                <span className={styles.badge}>
                  +{question.marks} / -{question.negativeMarks}
                </span>
                {question.chapter && <span className={styles.badge}>{question.chapter}</span>}
              </div>

              {question.text?.trim() && <MathText as="div" className={styles.qtext} text={question.text} />}
              {question.imageUrl && <img src={assetUrl(question.imageUrl)} alt="" className={styles.qimg} />}

              {question.type === 'numerical' ? (
                <input
                  type="number"
                  className={styles.numericInput}
                  value={answer.numericAnswer ?? ''}
                  onChange={(e) => setAnswer({ numericAnswer: e.target.value === '' ? undefined : Number(e.target.value) })}
                  placeholder="Enter your answer"
                />
              ) : (
                <div className={styles.options}>
                  {question.options.map((opt, optIndex) => {
                    const isSelected = (answer.selectedOptionIndexes || []).includes(optIndex);
                    return (
                      <button
                        type="button"
                        key={optIndex}
                        className={`${styles.opt} ${isSelected ? styles.optSelected : ''}`}
                        onClick={() => toggleOption(optIndex)}
                      >
                        <span className={styles.optLabel}>{String.fromCharCode(65 + optIndex)}</span>
                        <span>
                          {opt.text?.trim() && <MathText text={opt.text} />}
                          {opt.imageUrl && <img src={assetUrl(opt.imageUrl)} alt="" className={styles.optImg} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className={styles.navrow}>
                <Button type="button" variant="ghost" disabled={currentIndex === 0} onClick={() => setCurrentIndex((i) => i - 1)}>
                  ← Previous
                </Button>
                <span className={styles.navpos}>
                  {currentIndex + 1} of {questions.length}
                </span>
                {isLast ? (
                  <Button type="button" disabled={submitting} onClick={handleFinish}>
                    {submitting ? 'Finishing…' : 'Finish Practice'}
                  </Button>
                ) : (
                  <Button type="button" onClick={() => setCurrentIndex((i) => i + 1)}>
                    Next →
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
