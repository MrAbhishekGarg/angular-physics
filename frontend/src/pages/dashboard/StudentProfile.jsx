import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { EXAM_TRACKS, getTrackMeta } from '../../data/examTracks.js';
import formStyles from './DashboardForm.module.css';

export default function StudentProfile() {
  const { user, updateTrack } = useAuth();
  const currentTrackMeta = getTrackMeta(user?.track);
  const [editingTrack, setEditingTrack] = useState(false);
  const [selected, setSelected] = useState(user?.track || '');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!selected || selected === user?.track) {
      setEditingTrack(false);
      return;
    }
    setStatus('saving');
    setError('');
    try {
      await updateTrack(selected);
      setEditingTrack(false);
      setStatus('idle');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <>
      <SEO title="My Profile" description="Your account details and exam track." path="/dashboard/student/profile" />
      <DashboardLayout role="student">
        <div className={formStyles.wrap} style={{ maxWidth: 560 }}>
          <h1>My Profile</h1>

          <div className={`${formStyles.card} ${formStyles.form}`}>
            <div className={formStyles.row}>
              <label>
                Name
                <input value={user?.name || ''} disabled />
              </label>
              <label>
                Email
                <input value={user?.email || ''} disabled />
              </label>
            </div>
          </div>

          <div className={formStyles.card}>
            <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Exam Track
            </span>
            <p style={{ fontSize: '0.82rem', color: 'var(--ap-text-muted)', margin: '0 0 0.6rem' }}>
              This decides what practice and content is shown to you by default.
            </p>

            {!editingTrack ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {currentTrackMeta ? `${currentTrackMeta.icon} ${currentTrackMeta.label}` : 'Not set'}
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingTrack(true)}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ maxWidth: 320 }}>
                  {EXAM_TRACKS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                  <Button type="button" size="sm" disabled={status === 'saving'} onClick={handleSave}>
                    {status === 'saving' ? 'Saving…' : 'Save'}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingTrack(false)}>
                    Cancel
                  </Button>
                </div>
                {status === 'error' && <p className={formStyles.errorMsg}>{error}</p>}
              </>
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
