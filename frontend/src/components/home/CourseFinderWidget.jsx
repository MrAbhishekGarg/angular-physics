import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCourses } from '../../hooks/useCourses.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import { formatPrice } from '../../data/courseFormat.js';
import styles from './CourseFinderWidget.module.css';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

/**
 * Guided "Course Finder" — button-based questions matched purely client-side
 * against the already-loaded course list. This is NOT a conversational AI
 * chatbot (no external LLM call, by design — see project decisions); it's a
 * small rule-based quiz that reuses the same track/level metadata Course
 * cards already display.
 */
export default function CourseFinderWidget() {
  const { data: courses } = useCourses();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ track: null, level: null, timeline: null });

  const reset = () => {
    setStep(0);
    setAnswers({ track: null, level: null, timeline: null });
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const answer = (key, value) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    setStep((s) => s + 1);
  };

  const matches = (courses || [])
    .filter((c) => c.status === 'open')
    .filter((c) => !answers.track || c.track === answers.track || (answers.timeline === 'crash' && c.track === 'crash-course'))
    .sort((a, b) => {
      const scoreOf = (c) => {
        let score = 0;
        if (answers.level && c.level === answers.level) score += 2;
        if (answers.timeline === 'crash' && c.track === 'crash-course') score += 2;
        if (c.isFeatured) score += 1;
        return score;
      };
      return scoreOf(b) - scoreOf(a);
    })
    .slice(0, 3);

  return (
    <>
      <button type="button" className={styles.launcher} onClick={() => setOpen(true)}>
        🎯 Find My Course
      </button>

      {open && (
        <div className={styles.backdrop} onClick={close}>
          <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.panelHeader}>
              <strong>Course Finder</strong>
              <button type="button" className={styles.closeBtn} onClick={close} aria-label="Close">
                ✕
              </button>
            </div>

            {step === 0 && (
              <>
                <p>What are you preparing for?</p>
                {EXAM_TRACKS.map((t) => (
                  <button key={t.key} type="button" className={styles.optionBtn} onClick={() => answer('track', t.key)}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </>
            )}

            {step === 1 && (
              <>
                <p>What's your current level?</p>
                {LEVELS.map((l) => (
                  <button key={l} type="button" className={styles.optionBtn} onClick={() => answer('level', l)}>
                    {l}
                  </button>
                ))}
              </>
            )}

            {step === 2 && (
              <>
                <p>What's your timeline?</p>
                <button type="button" className={styles.optionBtn} onClick={() => answer('timeline', 'long')}>
                  Long-term prep (6+ months)
                </button>
                <button type="button" className={styles.optionBtn} onClick={() => answer('timeline', 'crash')}>
                  Crash course (under 3 months)
                </button>
              </>
            )}

            {step >= 3 && (
              <>
                <p>Here's what we'd recommend:</p>
                {matches.length === 0 ? (
                  <p style={{ color: 'var(--ap-text-muted)', fontSize: '0.9rem' }}>
                    No open courses match right now — check back soon or browse all courses.
                  </p>
                ) : (
                  matches.map((c) => (
                    <div key={c._id} className={styles.resultCard}>
                      <strong>{c.title}</strong>
                      <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)', margin: '0.2rem 0' }}>
                        {c.tagline}
                      </p>
                      <p style={{ fontSize: '0.85rem', margin: '0.2rem 0' }}>{formatPrice(c.price, c.currency)}</p>
                      <Link to={`/courses/${c.slug}`} onClick={close}>
                        View course →
                      </Link>
                    </div>
                  ))
                )}
                <button type="button" className={styles.optionBtn} onClick={reset}>
                  Start over
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
