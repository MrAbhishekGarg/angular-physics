import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useToppers } from '../../hooks/useToppers.js';
import { useCourses } from '../../hooks/useCourses.js';
import { topperService } from '../../services/topperService.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import formStyles from './DashboardForm.module.css';

const emptyForm = { name: '', achievement: '', track: EXAM_TRACKS[0].key, courseId: '', order: 0 };

export default function ToppersManager() {
  const { data: toppers, loading, error, refetch } = useToppers();
  const { data: courses } = useCourses();
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const payload = { ...form, courseId: form.courseId || null, order: Number(form.order) || 0 };
      const topper = await topperService.create(payload);
      if (photoFile) await topperService.uploadPhoto(topper._id, photoFile);
      setForm(emptyForm);
      setPhotoFile(null);
      await refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (topper) => {
    if (!window.confirm(`Delete "${topper.name}"?`)) return;
    await topperService.remove(topper._id);
    await refetch();
  };

  return (
    <>
      <SEO title="Manage Toppers" description="Showcase students from ongoing batches on the homepage." path="/dashboard/mentor/toppers" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <h1>Manage Toppers</h1>

            {loading && <Spinner label="Loading toppers…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}

            {toppers && (
              <div style={{ marginBottom: 'var(--ap-space-lg)' }}>
                {toppers.length === 0 ? (
                  <p style={{ color: 'var(--ap-text-muted)' }}>No toppers added yet.</p>
                ) : (
                  toppers.map((t) => (
                    <div key={t._id} className={formStyles.card}>
                      <div className={formStyles.cardHeader}>
                        <strong>{t.name}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>{t.track}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem' }}>{t.achievement}</p>
                      {t.courseId?.title && <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>{t.courseId.title}</p>}
                      <Button size="sm" variant="danger" onClick={() => handleDelete(t)}>
                        Delete
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            <h2 style={{ color: 'var(--ap-primary)', marginBottom: 'var(--ap-space-sm)' }}>Add a Topper</h2>
            <form className={formStyles.form} onSubmit={handleSubmit}>
              <label>
                Name
                <input name="name" required value={form.name} onChange={handleChange} />
              </label>
              <label>
                Achievement
                <input name="achievement" required value={form.achievement} onChange={handleChange} placeholder="AIR 47, JEE Advanced 2026" />
              </label>

              <div className={formStyles.row}>
                <label>
                  Track
                  <select name="track" value={form.track} onChange={handleChange}>
                    {EXAM_TRACKS.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Batch (optional)
                  <select name="courseId" value={form.courseId} onChange={handleChange}>
                    <option value="">— none —</option>
                    {(courses || []).map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Photo (optional)
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhotoFile(e.target.files[0])} />
              </label>

              <div className={formStyles.actions}>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Add Topper'}
                </Button>
              </div>

              {formError && <p className={formStyles.errorMsg}>{formError}</p>}
            </form>
        </div>
      </DashboardLayout>
    </>
  );
}
