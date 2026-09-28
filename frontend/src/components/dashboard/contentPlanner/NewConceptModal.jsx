import { useMemo, useState } from 'react';
import Button from '../../common/Button.jsx';
import { CURRICULUM_CHAPTERS, CURRICULUM_TOPICS } from '../../../data/physicsCurriculum.js';
import styles from './ConceptModal.module.css';

const EMPTY_FORM = {
  title: '',
  chapter: '',
  topic: '',
  notes: '',
  longVideoCount: 1,
  longVideoPlatforms: 'youtube',
  includeShort: true,
  shortPlatforms: 'both',
  includeCarousel: false,
  includeCommunityPost: false,
  isPYQ: false,
  source: '',
  pyqYear: '',
};

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
          includeCommunityPost: form.includeCommunityPost,
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
              <div className={styles.bundleSubRow}>
                <span className={styles.bundleSubLabel}>on</span>
                <select name="longVideoPlatforms" value={form.longVideoPlatforms} onChange={handleChange} className={styles.platformSelect}>
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                  <option value="both">Both platforms</option>
                </select>
              </div>
            )}

            <label className={styles.toggleRow}>
              <input type="checkbox" name="includeShort" checked={form.includeShort} onChange={handleChange} />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleText}>⚡ Short</span>
            </label>
            {form.includeShort && (
              <div className={styles.bundleSubRow}>
                <span className={styles.bundleSubLabel}>on</span>
                <select name="shortPlatforms" value={form.shortPlatforms} onChange={handleChange} className={styles.platformSelect}>
                  <option value="both">Both platforms</option>
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>
            )}

            <label className={styles.toggleRow}>
              <input type="checkbox" name="includeCarousel" checked={form.includeCarousel} onChange={handleChange} />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleText}>🖼️ Carousel (Instagram)</span>
            </label>

            <label className={styles.toggleRow}>
              <input type="checkbox" name="includeCommunityPost" checked={form.includeCommunityPost} onChange={handleChange} />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleText}>💬 Community Post (YouTube)</span>
            </label>
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
