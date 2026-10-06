import { useMemo, useState } from 'react';
import Button from '../../common/Button.jsx';
import { CURRICULUM_CHAPTERS, CURRICULUM_TOPICS } from '../../../data/physicsCurriculum.js';
import { PLATFORM_META } from '../../../data/contentPlannerMeta.js';
import styles from './ConceptModal.module.css';

const EMPTY_FORM = {
  title: '',
  chapter: '',
  topic: '',
  notes: '',
  longVideoCount: 1,
  longVideoPlatforms: ['youtube'],
  includeShort: true,
  shortPlatforms: ['youtube', 'instagram'],
  includeCarousel: false,
  carouselPlatforms: ['instagram'],
  includeCommunityPost: false,
  communityPostPlatforms: ['youtube'],
  includePollQuestion: false,
  pollQuestionPlatforms: ['telegram'],
  isPYQ: false,
  source: '',
  pyqYear: '',
};

/**
 * Every bundle item used to be stuck on one platform (a single <select>, or
 * no choice at all for Carousel/Community Post) — this is the one piece of
 * UI for ticking any combination instead, shared by all five so a long
 * video and a poll question pick platforms the same way.
 */
function PlatformTicks({ value, onToggle }) {
  return (
    <div className={styles.platformTicks}>
      {Object.entries(PLATFORM_META).map(([key, m]) => {
        const active = value.includes(key);
        return (
          <button
            type="button"
            key={key}
            className={`${styles.platformTick} ${active ? styles.platformTickActive : ''}`}
            onClick={() => onToggle(key)}
            aria-pressed={active}
          >
            {m.icon} {m.label}
          </button>
        );
      })}
    </div>
  );
}

export default function NewConceptModal({ onClose, onCreate, questionTaxonomy, usedTopics }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const chapterOptions = useMemo(
    () => [...new Set([...CURRICULUM_CHAPTERS, ...(questionTaxonomy?.chapters || []), ...(usedTopics?.chapters || [])])].sort(),
    [questionTaxonomy, usedTopics]
  );
  const topicOptions = useMemo(
    () => [...new Set([...CURRICULUM_TOPICS, ...(questionTaxonomy?.topics || []), ...(usedTopics?.topics || [])])].sort(),
    [questionTaxonomy, usedTopics]
  );

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  // Ticking the last-remaining platform off would leave that bundle item
  // with nowhere to go, so it's left with at least one — the mentor turns
  // the whole item off with its own toggle instead of emptying this out.
  const togglePlatform = (field, key) => {
    setForm((f) => {
      const current = f[field];
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      return next.length === 0 ? f : { ...f, [field]: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await onCreate({
        title: form.title,
        chapter: form.chapter,
        topic: form.topic,
        notes: form.notes,
        source: form.source,
        isPYQ: form.isPYQ,
        pyqYear: form.isPYQ && form.pyqYear ? Number(form.pyqYear) : undefined,
        bundle: {
          longVideoCount: Number(form.longVideoCount),
          longVideoPlatforms: form.longVideoPlatforms,
          includeShort: form.includeShort,
          shortPlatforms: form.shortPlatforms,
          includeCarousel: form.includeCarousel,
          carouselPlatforms: form.carouselPlatforms,
          includeCommunityPost: form.includeCommunityPost,
          communityPostPlatforms: form.communityPostPlatforms,
          includePollQuestion: form.includePollQuestion,
          pollQuestionPlatforms: form.pollQuestionPlatforms,
        },
      });
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="new-concept-title" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h2 id="new-concept-title">+ New Concept</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label>
            Concept title
            <input
              name="title"
              required
              autoFocus
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Metacenter & Equilibrium of Floating Bodies"
            />
          </label>

          <div className={styles.row}>
            <label>
              Chapter
              <input name="chapter" value={form.chapter} onChange={handleChange} placeholder="e.g. Mechanical Properties of Fluids" list="cp-chapter-suggestions" />
              <datalist id="cp-chapter-suggestions">
                {chapterOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label>
              Topic
              <input name="topic" value={form.topic} onChange={handleChange} placeholder="e.g. Metacenter" list="cp-topic-suggestions" />
              <datalist id="cp-topic-suggestions">
                {topicOptions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>
          </div>

          <div className={styles.bundleBox}>
            <span className={styles.bundleLabel}>Create these pieces now</span>

            <div className={styles.bundleRow}>
              <span className={styles.bundleItemLabel}>🎬 Long video(s)</span>
              <div className={styles.segmentGroup}>
                {[1, 2].map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={`${styles.segmentBtn} ${Number(form.longVideoCount) === n ? styles.segmentBtnActive : ''}`}
                    onClick={() => setForm((f) => ({ ...f, longVideoCount: n }))}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${styles.segmentBtn} ${Number(form.longVideoCount) === 0 ? styles.segmentBtnActive : ''}`}
                  onClick={() => setForm((f) => ({ ...f, longVideoCount: 0 }))}
                >
                  None
                </button>
              </div>
            </div>
            {Number(form.longVideoCount) > 0 && (
              <PlatformTicks value={form.longVideoPlatforms} onToggle={(key) => togglePlatform('longVideoPlatforms', key)} />
            )}

            <label className={styles.toggleRow}>
              <input type="checkbox" name="includeShort" checked={form.includeShort} onChange={handleChange} />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleText}>⚡ Short</span>
            </label>
            {form.includeShort && <PlatformTicks value={form.shortPlatforms} onToggle={(key) => togglePlatform('shortPlatforms', key)} />}

            <label className={styles.toggleRow}>
              <input type="checkbox" name="includeCarousel" checked={form.includeCarousel} onChange={handleChange} />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleText}>🖼️ Carousel</span>
            </label>
            {form.includeCarousel && (
              <PlatformTicks value={form.carouselPlatforms} onToggle={(key) => togglePlatform('carouselPlatforms', key)} />
            )}

            <label className={styles.toggleRow}>
              <input type="checkbox" name="includeCommunityPost" checked={form.includeCommunityPost} onChange={handleChange} />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleText}>💬 Community Post</span>
            </label>
            {form.includeCommunityPost && (
              <PlatformTicks value={form.communityPostPlatforms} onToggle={(key) => togglePlatform('communityPostPlatforms', key)} />
            )}

            <label className={styles.toggleRow}>
              <input type="checkbox" name="includePollQuestion" checked={form.includePollQuestion} onChange={handleChange} />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleText}>📊 Poll Question</span>
            </label>
            {form.includePollQuestion && (
              <PlatformTicks value={form.pollQuestionPlatforms} onToggle={(key) => togglePlatform('pollQuestionPlatforms', key)} />
            )}
          </div>

          <div className={styles.pyqBox}>
            <label className={styles.toggleRow}>
              <input type="checkbox" name="isPYQ" checked={form.isPYQ} onChange={handleChange} />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleText}>🏆 Based on a PYQ (applies to every piece above)</span>
            </label>
            <div className={styles.row}>
              <label>
                Source
                <input name="source" value={form.source} onChange={handleChange} placeholder="e.g. JEE Mains 2025" />
              </label>
              {form.isPYQ && (
                <label>
                  Year
                  <input type="number" name="pyqYear" value={form.pyqYear} onChange={handleChange} placeholder="e.g. 2025" min="1990" max="2099" />
                </label>
              )}
            </div>
          </div>

          <label>
            Notes (optional)
            <textarea name="notes" rows="2" value={form.notes} onChange={handleChange} placeholder="Anything worth remembering about this concept" />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.modalActions}>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating…' : '✨ Create Concept'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
