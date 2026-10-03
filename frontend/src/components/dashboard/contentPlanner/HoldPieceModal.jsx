import { useState } from 'react';
import Button from '../../common/Button.jsx';
import { STATUS_ORDER, STATUS_META, TYPE_META } from '../../../data/contentPlannerMeta.js';
import styles from './ConceptModal.module.css';

/**
 * "On Hold" is a basket for reserving a piece for later, not a pipeline
 * stage — so putting something on hold still needs a real status
 * underneath (recorded/edited/whichever stage it actually reached) for
 * when it comes back off hold. Defaults to the piece's current status
 * since putting something on hold usually doesn't change what stage it's
 * at, just defers it; the mentor only needs to correct this if it's wrong.
 */
export default function HoldPieceModal({ piece, onClose, onConfirm }) {
  const [status, setStatus] = useState(piece.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setSaving(true);
    setError('');
    try {
      await onConfirm(status);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="hold-piece-title" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h2 id="hold-piece-title">⏸️ Put on hold</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className={styles.modalSub}>
          {piece.label || TYPE_META[piece.type].label} · <code className={styles.pieceIdInline}>{piece.pieceId}</code>
        </p>

        <div className={styles.form}>
          <label>
            What stage is it actually at?
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].icon} {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
          <p className={styles.modalSub} style={{ margin: 0 }}>
            On Hold is a basket, not a stage — this is just so it resumes at the right point later instead of losing its
            place.
          </p>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.modalActions}>
            <Button type="button" disabled={saving} onClick={handleConfirm}>
              {saving ? 'Saving…' : '⏸️ Put on hold'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
