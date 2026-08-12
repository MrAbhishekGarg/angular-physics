import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useMentorTestimonials } from '../../hooks/useTestimonials.js';
import { testimonialService } from '../../services/testimonialService.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import formStyles from './DashboardForm.module.css';

const emptyForm = { studentName: '', result: '', track: EXAM_TRACKS[0].key, quote: '', videoUrl: '' };

export default function TestimonialManager() {
  const { data: testimonials, loading, error, refetch } = useMentorTestimonials();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const startEdit = (testimonial) => {
    setEditingId(testimonial._id);
    setForm({
      studentName: testimonial.studentName,
      result: testimonial.result,
      track: testimonial.track,
      quote: testimonial.quote,
      videoUrl: testimonial.videoUrl || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const payload = { ...form, videoUrl: form.videoUrl || undefined };
      if (editingId) await testimonialService.update(editingId, payload);
      else await testimonialService.create(payload);
      setForm(emptyForm);
      setEditingId(null);
      await refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (testimonial) => {
    if (!window.confirm(`Delete the testimonial from "${testimonial.studentName}"?`)) return;
    await testimonialService.remove(testimonial._id);
    await refetch();
  };

  return (
    <>
      <SEO title="Manage Testimonials" description="Showcase student testimonials on the homepage." path="/dashboard/mentor/testimonials" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap}>
          <h1>Manage Testimonials</h1>

          {loading && <Spinner label="Loading testimonials…" />}
          {error && <ErrorState message={error} onRetry={refetch} />}

          {testimonials && (
            <div style={{ marginBottom: 'var(--ap-space-lg)' }}>
              {testimonials.length === 0 ? (
                <p style={{ color: 'var(--ap-text-muted)' }}>No testimonials added yet.</p>
              ) : (
                testimonials.map((t) => (
                  <div key={t._id} className={formStyles.card}>
                    <div className={formStyles.cardHeader}>
                      <strong>{t.studentName}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>{t.track}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>{t.result}</p>
                    <p style={{ fontSize: '0.85rem' }}>&ldquo;{t.quote}&rdquo;</p>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(t)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(t)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <h2 style={{ color: 'var(--ap-primary)', marginBottom: 'var(--ap-space-sm)' }}>
            {editingId ? 'Edit Testimonial' : 'Add a Testimonial'}
          </h2>
          <form className={formStyles.form} onSubmit={handleSubmit}>
            <label>
              Student name
              <input name="studentName" required value={form.studentName} onChange={handleChange} />
            </label>
            <label>
              Result
              <input
                name="result"
                required
                value={form.result}
                onChange={handleChange}
                placeholder="AIR 47, JEE Advanced 2026"
              />
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
                Video URL (optional)
                <input name="videoUrl" value={form.videoUrl} onChange={handleChange} placeholder="https://..." />
              </label>
            </div>

            <label>
              Quote
              <textarea name="quote" rows="3" required value={form.quote} onChange={handleChange} />
            </label>

            <div className={formStyles.actions}>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : editingId ? 'Save Changes' : 'Add Testimonial'}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>

            {formError && <p className={formStyles.errorMsg}>{formError}</p>}
          </form>
        </div>
      </DashboardLayout>
    </>
  );
}
