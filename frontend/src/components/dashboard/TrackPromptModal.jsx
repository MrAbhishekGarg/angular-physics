import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import styles from './TrackPromptModal.module.css';

/**
 * One-time blocking prompt for students who registered before the `track`
 * field existed (see backend/src/models/User.js) — asks once, then never
 * again, since a successful save clears user.track and DashboardLayout
 * stops rendering this.
 */
export default function TrackPromptModal() {
  const { updateTrack } = useAuth();
  const [selected, setSelected] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!selected) return;
    setStatus('saving');
    setError('');
    try {
      await updateTrack(selected);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="track-prompt-title">
      <div className={styles.modal}>
        <h2 id="track-prompt-title">What are you preparing for?</h2>
        <p className={styles.sub}>Quick one-time question — this personalizes your practice, tests, and notes.</p>
        <div className={styles.options}>
          {EXAM_TRACKS.map((t) => (
            <button
              type="button"
              key={t.key}
              className={`${styles.option} ${selected === t.key ? styles.optionSelected : ''}`}
              onClick={() => setSelected(t.key)}
            >
              <span className={styles.optionIcon}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
        {status === 'error' && <p className={styles.error}>{error}</p>}
        <button type="button" className={styles.saveBtn} disabled={!selected || status === 'saving'} onClick={handleSave}>
          {status === 'saving' ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
