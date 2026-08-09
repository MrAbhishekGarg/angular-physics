import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { testService } from '../../services/testService.js';
import { useProctoring } from '../../hooks/useProctoring.js';
import { useAuth, isMentorRole } from '../../hooks/useAuth.js';
import { assetUrl } from '../../data/assetUrl.js';
import styles from './TestAttempt.module.css';

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

function hasRealAnswer(answer) {
  if (!answer) return false;
  if (answer.selectedOptionIndexes && answer.selectedOptionIndexes.length > 0) return true;
  return answer.numericAnswer !== undefined && answer.numericAnswer !== null;
}

const STATUS_META = {
  notVisited: { label: 'Not Visited', swatch: styles.colorNotVisited, shape: 'square' },
  notAnswered: { label: 'Not Answered', swatch: styles.colorNotAnswered, shape: 'square' },
  answered: { label: 'Answered', swatch: styles.colorAnswered, shape: 'square' },
  marked: { label: 'Marked for Review', swatch: styles.colorMarked, shape: 'circle' },
  answeredMarked: { label: 'Answered & Marked for Review', swatch: styles.colorAnsweredMarked, shape: 'circle' },
};
const STATUS_ORDER = ['notVisited', 'notAnswered', 'answered', 'marked', 'answeredMarked'];

export default function TestAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [state, setState] = useState({ loading: true, error: '', test: null, attempt: null });
  const [answers, setAnswers] = useState({});
  const [visited, setVisited] = useState(new Set());
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [instructionsAcknowledged, setInstructionsAcknowledged] = useState(false);

  useEffect(() => {
    testService
      .start(id)
      .then(({ test, attempt }) => {
        setState({ loading: false, error: '', test, attempt });
        const deadline = new Date(attempt.startedAt).getTime() + attempt.durationMinutes * 60 * 1000;
        setRemaining((deadline - Date.now()) / 1000);

        const restored = {};
        (attempt.answers || []).forEach((a) => {
          restored[a.questionIndex] = a;
        });
        setAnswers(restored);
        setVisited(new Set([0]));
      })
      .catch((err) => setState({ loading: false, error: err.message, test: null, attempt: null }));
  }, [id]);

  const handleSubmit = useMemo(
    () => async (auto, proctoringCounts) => {
      if (submittingRef.current || !state.attempt) return;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        const answersArray = Object.entries(answers).map(([questionIndex, a]) => ({
          questionIndex: Number(questionIndex),
          ...a,
        }));
        await testService.submit(state.attempt._id, { answers: answersArray, proctoring: proctoringCounts || {} });
        const resultBase = isMentorRole(user?.role) ? '/dashboard/mentor/tests/attempts' : '/dashboard/student/tests/attempts';
        navigate(`${resultBase}/${state.attempt._id}/result`);
      } catch (err) {
        submittingRef.current = false;
        setSubmitting(false);
        setState((s) => ({ ...s, error: err.message }));
      }
    },
    [answers, state.attempt, navigate, user]
  );

  const { counts, countsRef } = useProctoring({
    enabled: Boolean(state.attempt) && !submitting,
    onExceeded: (finalCounts) => handleSubmit(true, finalCounts),
  });

  useEffect(() => {
    if (!state.attempt || submitting) return;
    const interval = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        if (next <= 0) {
          clearInterval(interval);
          handleSubmit(true, countsRef.current);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.attempt, submitting]);

  // Autosave answers to the server as the student works, debounced — this is
  // what lets a resumed attempt (after a power cut / closed tab) restore the
  // student's actual answers, not just the timer. Without it, the answers
  // above only exist in this component's React state and would be lost the
  // instant the tab dies, even though startAttempt correctly resumes the
  // same attempt/timer.
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (!state.attempt || submitting) return;
    saveTimerRef.current = setTimeout(() => {
      const answersArray = Object.entries(answers).map(([questionIndex, a]) => ({
        questionIndex: Number(questionIndex),
        ...a,
      }));
      testService.saveProgress(state.attempt._id, { answers: answersArray }).catch(() => {});
    }, 1500);
    return () => clearTimeout(saveTimerRef.current);
  }, [answers, state.attempt, submitting]);

  if (state.loading) return <Spinner label="Starting test…" />;
  if (state.error) {
    return (
      <main>
        <div style={{ padding: '2rem' }}>
          <ErrorState message={state.error} />
        </div>
      </main>
    );
  }

  const { test } = state;
  const sections = test.sections || [];
  const hasInstructionsScreen = Boolean(test.instructions) || sections.length > 0;

  if (hasInstructionsScreen && !instructionsAcknowledged) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.brand}>Angular Physics</span>
            <span className={styles.subject}>Subject: Physics</span>
          </div>
          <div className={styles.headerCenter}>{user?.name}</div>
        </header>
        <div className={styles.instructionsWrap}>
          <div className={styles.instructionsCard}>
            <h1 style={{ marginTop: 0 }}>{test.title}</h1>
            {test.instructions && <p className={styles.instructionsBody}>{test.instructions}</p>}
            {sections.map((s) => (
              <div key={s.name} className={styles.sectionInstructionBlock}>
                <div className={styles.sectionInstructionTitle}>{s.name}</div>
                <div className={styles.sectionInstructionRange}>
                  Question {s.startIndex + 1}–{s.endIndex + 1} ({s.count} question{s.count === 1 ? '' : 's'})
                </div>
                {s.instructions && <p className={styles.instructionsBody}>{s.instructions}</p>}
              </div>
            ))}
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              onClick={() => setInstructionsAcknowledged(true)}
            >
              I've read the instructions — Start Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = test.questions[currentIndex];
  const answer = answers[currentIndex] || {};
  const isCurrentMarked = markedForReview.has(currentIndex);

  const goTo = (index) => {
    setCurrentIndex(index);
    setVisited((v) => new Set(v).add(index));
  };

  const setAnswer = (patch) => setAnswers((a) => ({ ...a, [currentIndex]: { ...a[currentIndex], ...patch } }));

  const toggleOption = (optIndex) => {
    if (question.type === 'mcq-single') {
      setAnswer({ selectedOptionIndexes: [optIndex] });
      return;
    }
    const current = answer.selectedOptionIndexes || [];
    setAnswer({
      selectedOptionIndexes: current.includes(optIndex)
        ? current.filter((i) => i !== optIndex)
        : [...current, optIndex],
    });
  };

  const getStatus = (index) => {
    const a = answers[index];
    const answeredReal = hasRealAnswer(a);
    const marked = markedForReview.has(index);
    if (marked && answeredReal) return 'answeredMarked';
    if (marked) return 'marked';
    if (answeredReal) return 'answered';
    if (visited.has(index)) return 'notAnswered';
    return 'notVisited';
  };

  const statusCounts = STATUS_ORDER.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
  test.questions.forEach((_, i) => {
    statusCounts[getStatus(i)] += 1;
  });

  const goNext = () => {
    if (currentIndex < test.questions.length - 1) goTo(currentIndex + 1);
  };
  const goPrev = () => {
    if (currentIndex > 0) goTo(currentIndex - 1);
  };

  const handleClearResponse = () => {
    setAnswers((a) => ({ ...a, [currentIndex]: { selectedOptionIndexes: [], numericAnswer: undefined } }));
  };

  const handleMarkForReview = () => {
    setMarkedForReview((m) => new Set(m).add(currentIndex));
    goNext();
  };

  const handleUnmarkForReview = () => {
    setMarkedForReview((m) => {
      const next = new Set(m);
      next.delete(currentIndex);
      return next;
    });
  };

  const handleSaveAndNext = () => {
    goNext();
  };

  const handleConfirmSubmit = () => {
    const notAnsweredCount = statusCounts.notAnswered + statusCounts.notVisited;
    const summary =
      `Answered: ${statusCounts.answered + statusCounts.answeredMarked}\n` +
      `Not Answered: ${notAnsweredCount}\n` +
      `Marked for Review: ${statusCounts.marked + statusCounts.answeredMarked}\n\n` +
      (notAnsweredCount > 0
        ? `You have ${notAnsweredCount} unanswered question(s). Submit anyway?`
        : 'Submit the test now?');
    if (window.confirm(summary)) {
      handleSubmit(false, countsRef.current);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.brand}>Angular Physics</span>
          <span className={styles.subject}>Subject: Physics</span>
        </div>
        <div className={styles.headerCenter}>{user?.name}</div>
        <span className={`${styles.timer} ${remaining < 60 ? styles.timerLow : ''}`}>⏱ {formatTime(remaining)}</span>
      </header>

      {(counts.tabSwitchCount > 0 || counts.fullscreenExitCount > 0) && (
        <p className={styles.notice}>
          Proctoring notice: {counts.tabSwitchCount} tab switch(es), {counts.fullscreenExitCount} fullscreen exit(s)
          detected. Repeated violations will auto-submit your test.
        </p>
      )}

      {sections.length > 0 && (
        <div className={styles.sectionTabs}>
          {sections.map((s) => {
            const isActive = currentIndex >= s.startIndex && currentIndex <= s.endIndex;
            return (
              <button
                key={s.name}
                type="button"
                className={`${styles.sectionTab} ${isActive ? styles.sectionTabActive : ''}`}
                onClick={() => goTo(s.startIndex)}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.main}>
          <div className={styles.qHeader}>
            <span className={styles.qNumber}>
              Question {currentIndex + 1} of {test.questions.length}
            </span>
            <span className={styles.qMeta}>
              +{question.marks} / -{question.negativeMarks}
            </span>
          </div>

          {question.imageUrl ? (
            <img src={assetUrl(question.imageUrl)} alt={question.text} className={styles.stemImage} />
          ) : (
            <p className={styles.stemText}>{question.text}</p>
          )}

          {question.type === 'numerical' ? (
            <input
              type="number"
              className={styles.numericInput}
              value={answer.numericAnswer ?? ''}
              onChange={(e) => setAnswer({ numericAnswer: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
          ) : (
            <table className={styles.optionsTable}>
              <tbody>
                {question.options.map((opt, optIndex) => {
                  const isSelected = (answer.selectedOptionIndexes || []).includes(optIndex);
                  return (
                    <tr
                      key={optIndex}
                      className={`${styles.optionRow} ${isSelected ? styles.optionRowSelected : ''}`}
                      onClick={() => toggleOption(optIndex)}
                    >
                      <td className={styles.optionLetterCell}>
                        <span className={`${styles.optionLetter} ${styles[`letter${optIndex % 6}`]}`}>
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                      </td>
                      <td className={styles.optionContentCell}>
                        <label className={styles.optionLabel}>
                          <input
                            type={question.type === 'mcq-single' ? 'radio' : 'checkbox'}
                            name="option"
                            className={styles.srOnly}
                            checked={isSelected}
                            onChange={() => toggleOption(optIndex)}
                          />
                          {opt.imageUrl ? (
                            <img src={assetUrl(opt.imageUrl)} alt={opt.text} className={styles.optionImage} />
                          ) : (
                            opt.text
                          )}
                        </label>
                      </td>
                      <td className={styles.optionCheckCell}>
                        <span
                          className={`${styles.optionCheck} ${isSelected ? styles.optionCheckVisible : ''}`}
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.candidateName}>{user?.name}</div>

          <div className={styles.legend}>
            {STATUS_ORDER.map((key) => {
              const meta = STATUS_META[key];
              return (
                <div key={key} className={styles.legendItem}>
                  <span
                    className={`${styles.swatch} ${meta.shape === 'circle' ? styles.swatchCircle : styles.swatchSquare} ${meta.swatch}`}
                  />
                  <span>{meta.label}</span>
                  <span className={styles.legendCount}>{statusCounts[key]}</span>
                </div>
              );
            })}
          </div>

          {sections.length > 0 ? (
            <div className={styles.paletteSections}>
              {sections.map((s) => (
                <div key={s.name}>
                  <div className={styles.paletteSectionLabel}>{s.name}</div>
                  <div className={styles.paletteGrid}>
                    {Array.from({ length: s.endIndex - s.startIndex + 1 }, (_, offset) => s.startIndex + offset).map((i) => {
                      const status = getStatus(i);
                      const meta = STATUS_META[status];
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => goTo(i)}
                          className={`${styles.paletteBtn} ${meta.shape === 'circle' ? styles.paletteBtnCircle : styles.paletteBtnSquare} ${meta.swatch} ${
                            i === currentIndex ? styles.paletteBtnCurrent : ''
                          }`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.paletteGrid}>
              {test.questions.map((_, i) => {
                const status = getStatus(i);
                const meta = STATUS_META[status];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    className={`${styles.paletteBtn} ${meta.shape === 'circle' ? styles.paletteBtnCircle : styles.paletteBtnSquare} ${meta.swatch} ${
                      i === currentIndex ? styles.paletteBtnCurrent : ''
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          )}
        </aside>
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.bottomGroup}>
          <button type="button" className={styles.actionBtn} onClick={handleClearResponse}>
            Clear Response
          </button>
          {isCurrentMarked ? (
            <button type="button" className={styles.actionBtn} onClick={handleUnmarkForReview}>
              Unmark for Review
            </button>
          ) : (
            <button type="button" className={styles.actionBtn} onClick={handleMarkForReview}>
              Mark for Review & Next
            </button>
          )}
        </div>
        <div className={styles.bottomGroup}>
          <button type="button" className={styles.actionBtn} disabled={currentIndex === 0} onClick={goPrev}>
            ← Back
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            disabled={currentIndex === test.questions.length - 1}
            onClick={goNext}
          >
            Next →
          </button>
          {isCurrentMarked ? (
            <button type="button" className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={handleUnmarkForReview}>
              Unmark for Review
            </button>
          ) : (
            <button type="button" className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={handleMarkForReview}>
              Save & Mark for Review
            </button>
          )}
          <button type="button" className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={handleSaveAndNext}>
            Save & Next
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnSubmit}`}
            disabled={submitting}
            onClick={handleConfirmSubmit}
          >
            {submitting ? 'Submitting…' : 'Submit Test'}
          </button>
        </div>
      </div>
    </div>
  );
}
