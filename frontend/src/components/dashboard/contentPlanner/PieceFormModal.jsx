import { useState } from 'react';
import Button from '../../common/Button.jsx';
import { PLATFORM_META, TYPE_META } from '../../../data/contentPlannerMeta.js';
import styles from './ConceptModal.module.css';

const EMPTY_SHARED = {
  link: '',
  source: '',
  isPYQ: false,
  pyqYear: '',
  notes: '',
  scheduledFor: '',
  publishedAt: '',
};

const makeRow = () => ({ key: Math.random().toString(36).slice(2), platform: 'youtube', type: 'long-video', label: '' });

/** 'YYYY-MM-DDTHH:mm' for <input type="datetime-local">, in the viewer's local time. */
function toDatetimeLocal(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * One modal, two modes: `piece` present -> editing one existing piece
 * (platform/type fixed, baked into its reference id); `piece` absent ->
 * adding one or more new pieces to `concept` in a single submit — e.g. a
 * YouTube community post + an Instagram carousel for the same topic,
 * without a separate round trip (and board reload) per piece.
 */
export default function PieceFormModal({ concept, piece, onClose, onSubmit }) {
  const isEdit = Boolean(piece);

  const [editRow, setEditRow] = useState(isEdit ? { platform: piece.platform, type: piece.type, label: piece.label || '' } : null);
  const [rows, setRows] = useState(isEdit ? null : [makeRow()]);
  const [shared, setShared] = useState(
    isEdit
      ? {
          link: piece.link || '',
          source: piece.source || '',
          isPYQ: Boolean(piece.isPYQ),
          pyqYear: piece.pyqYear || '',
          notes: piece.notes || '',
          scheduledFor: piece.scheduledFor ? String(piece.scheduledFor).slice(0, 10) : '',
          publishedAt: toDatetimeLocal(piece.publishedAt),
        }
      : EMPTY_SHARED
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSharedChange = (e) => {
    const { name, type, value, checked } = e.target;
    setShared((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleRowChange = (key, field, value) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, makeRow()]);
  const removeRow = (key) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const sharedFields = {
      ...shared,
      pyqYear: shared.isPYQ && shared.pyqYear ? Number(shared.pyqYear) : undefined,
      scheduledFor: shared.scheduledFor || null,
      publishedAt: shared.publishedAt ? new Date(shared.publishedAt).toISOString() : null,
    };
    try {
      if (isEdit) {
        await onSubmit({ ...sharedFields, label: editRow.label });
      } else {
        await onSubmit(rows.map((r) => ({ ...sharedFields, platform: r.platform, type: r.type, label: r.label })));
      }
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="piece-form-title" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h2 id="piece-form-title">{isEdit ? 'Edit piece' : '+ Add piece(s)'}</h2>
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
          {isEdit ? (
            <>
              <div className={styles.row}>
                <label>
                  Platform
                  <select value={editRow.platform} disabled>
                    {Object.entries(PLATFORM_META).map(([k, m]) => (
                      <option key={k} value={k}>
                        {m.icon} {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Type
                  <select value={editRow.type} disabled>
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
                <input
                  value={editRow.label}
                  onChange={(e) => setEditRow((r) => ({ ...r, label: e.target.value }))}
                  placeholder={TYPE_META[editRow.type].label}
                />
              </label>
            </>
          ) : (
            <div className={styles.bundleBox}>
              <span className={styles.bundleLabel}>Pieces to add</span>
              {rows.map((r) => (
                <div key={r.key} className={styles.pieceRow}>
                  <select value={r.platform} onChange={(e) => handleRowChange(r.key, 'platform', e.target.value)}>
                    {Object.entries(PLATFORM_META).map(([k, m]) => (
                      <option key={k} value={k}>
                        {m.icon} {m.label}
                      </option>
                    ))}
                  </select>
                  <select value={r.type} onChange={(e) => handleRowChange(r.key, 'type', e.target.value)}>
                    {Object.entries(TYPE_META).map(([k, m]) => (
                      <option key={k} value={k}>
                        {m.icon} {m.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={r.label}
                    onChange={(e) => handleRowChange(r.key, 'label', e.target.value)}
                    placeholder={TYPE_META[r.type].label}
                    className={styles.pieceRowLabel}
                  />
                  <button
                    type="button"
                    className={styles.pieceRowRemove}
                    onClick={() => removeRow(r.key)}
                    disabled={rows.length === 1}
                    aria-label="Remove this piece"
                    title="Remove this piece"
                  >
                    ×
                  </button>
                </div>
              ))}
              <Button type="button" size="sm" variant="ghost" onClick={addRow}>
                + Add another piece
              </Button>
            </div>
          )}

          <label>
            Link (optional)
            <input name="link" value={shared.link} onChange={handleSharedChange} placeholder="https://…" />
          </label>

          <div className={styles.pyqBox}>
            <label className={styles.toggleRow}>
              <input type="checkbox" name="isPYQ" checked={shared.isPYQ} onChange={handleSharedChange} />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleText}>🏆 Based on a PYQ</span>
            </label>
            <div className={styles.row}>
              <label>
                Source
                <input name="source" value={shared.source} onChange={handleSharedChange} placeholder="e.g. JEE Mains 2025" />
              </label>
              {shared.isPYQ && (
                <label>
                  Year
                  <input type="number" name="pyqYear" value={shared.pyqYear} onChange={handleSharedChange} placeholder="e.g. 2025" min="1990" max="2099" />
                </label>
              )}
            </div>
          </div>

          <label>
            Scheduled for (optional)
            <input type="date" name="scheduledFor" value={shared.scheduledFor} onChange={handleSharedChange} />
          </label>

          <label>
            Published at (optional — set automatically when you move this to Published; edit here to correct or backdate it)
            <input type="datetime-local" name="publishedAt" value={shared.publishedAt} onChange={handleSharedChange} />
          </label>

          <label>
            Notes (optional)
            <textarea name="notes" rows="2" value={shared.notes} onChange={handleSharedChange} placeholder="Anything worth remembering" />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.modalActions}>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : rows.length > 1 ? `Add ${rows.length} pieces` : 'Add piece'}
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
