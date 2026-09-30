import { useMemo, useState } from 'react';
import Button from '../../common/Button.jsx';
import { CURRICULUM_CHAPTERS, CURRICULUM_TOPICS } from '../../../data/physicsCurriculum.js';
import styles from './ConceptModal.module.css';

export default function EditConceptModal({ concept, onClose, onSubmit, questionTaxonomy, usedTopics }) {
  const [form, setForm] = useState({
    title: concept.title || '',
    chapter: concept.chapter || '',
    topic: concept.topic || '',
    notes: concept.notes || '',
  });
  const [saving, setSaving] = useState(false);
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
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="edit-concept-title" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h2 id="edit-concept-title">Edit concept</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className={styles.modalSub}>
          <code className={styles.pieceIdInline}>{concept.conceptId}</code>
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label>
            Concept title
            <input name="title" required autoFocus value={form.title} onChange={handleChange} />
          </label>

          <div className={styles.row}>
            <label>
              Chapter
              <input name="chapter" value={form.chapter} onChange={handleChange} list="edit-concept-chapter-suggestions" />
              <datalist id="edit-concept-chapter-suggestions">
                {chapterOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label>
              Topic
              <input name="topic" value={form.topic} onChange={handleChange} list="edit-concept-topic-suggestions" />
              <datalist id="edit-concept-topic-suggestions">
                {topicOptions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>
          </div>

          <label>
            Notes (optional)
            <textarea name="notes" rows="3" value={form.notes} onChange={handleChange} placeholder="Anything worth remembering about this concept" />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.modalActions}>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
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
