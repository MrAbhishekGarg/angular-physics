import { useState } from 'react';
import Button from '../../common/Button.jsx';
import { PLATFORM_META, TYPE_META } from '../../../data/contentPlannerMeta.js';
import styles from './ConceptModal.module.css';

const EMPTY = { platform: 'youtube', type: 'long-video', label: '', link: '', source: '', isPYQ: false, pyqYear: '', notes: '', scheduledFor: '' };

/**
 * One modal, two modes: `piece` present -> editing (platform/type are fixed,
 * since they're baked into the piece's reference id); `piece` absent ->
 * adding a new piece to `concept`.
 */
export default function PieceFormModal({ concept, piece, onClose, onSubmit }) {
  const isEdit = Boolean(piece);
  const [form, setForm] = useState(
    isEdit
      ? {
          platform: piece.platform,
          type: piece.type,
          label: piece.label || '',
          link: piece.link || '',
          source: piece.source || '',
          isPYQ: Boolean(piece.isPYQ),
          pyqYear: piece.pyqYear || '',
          notes: piece.notes || '',
          scheduledFor: piece.scheduledFor ? String(piece.scheduledFor).slice(0, 10) : '',
        }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        ...form,
        pyqYear: form.isPYQ && form.pyqYear ? Number(form.pyqYear) : undefined,
        scheduledFor: form.scheduledFor || null,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="piece-form-title" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h2 id="piece-form-title">{isEdit ? 'Edit piece' : '+ Add piece'}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className={styles.modalSub}>
          {concept.title}
          {isEdit && (
            <>
              {' '}
              · <code className={styles.pieceIdInline}>{piece.pieceId}</code>
            </>
          )}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <label>
              Platform
              <select name="platform" value={form.platform} onChange={handleChange} disabled={isEdit}>
                {Object.entries(PLATFORM_META).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.icon} {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Type
              <select name="type" value={form.type} onChange={handleChange} disabled={isEdit}>
                {Object.entries(TYPE_META).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.icon} {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Label
            <input name="label" value={form.label} onChange={handleChange} placeholder={TYPE_META[form.type].label} />
          </label>

          <label>
            Link (optional)
            <input name="link" value={form.link} onChange={handleChange} placeholder="https://…" />
          </label>

          <div className={styles.pyqBox}>
            <label className={styles.toggleRow}>
              <input type="checkbox" name="isPYQ" checked={form.isPYQ} onChange={handleChange} />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleText}>🏆 Based on a PYQ</span>
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
            Scheduled for (optional)
            <input type="date" name="scheduledFor" value={form.scheduledFor} onChange={handleChange} />
          </label>

          <label>
            Notes (optional)
            <textarea name="notes" rows="2" value={form.notes} onChange={handleChange} placeholder="Anything worth remembering" />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.modalActions}>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add piece'}
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
