import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useNotes } from '../../hooks/useNotes.js';
import { noteService } from '../../services/noteService.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import { formatPrice } from '../../data/courseFormat.js';
import formStyles from './DashboardForm.module.css';

const emptyForm = {
  title: '',
  description: '',
  track: EXAM_TRACKS[0].key,
  category: 'free',
  price: '',
};

export default function NotesManager() {
  const { data: notes, loading, error, refetch } = useNotes();
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const payload = {
        title: form.title,
        description: form.description,
        track: form.track,
        category: form.category,
        price: form.category === 'premium' ? Number(form.price) : 0,
      };
      const note = await noteService.create(payload);
      if (file) await noteService.uploadFile(note._id, file);
      setForm(emptyForm);
      setFile(null);
      await refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (note) => {
    if (!window.confirm(`Delete "${note.title}"?`)) return;
    await noteService.remove(note._id);
    await refetch();
  };

  return (
    <>
      <SEO title="Manage Notes" description="Upload and manage notes for students." path="/dashboard/mentor/notes" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <h1>Manage Notes</h1>

            {loading && <Spinner label="Loading notes…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}

            {notes && (
              <div style={{ marginBottom: 'var(--ap-space-lg)' }}>
                {notes.length === 0 ? (
                  <p style={{ color: 'var(--ap-text-muted)' }}>No notes uploaded yet.</p>
                ) : (
                  notes.map((note) => (
                    <div key={note._id} className={formStyles.card}>
                      <div className={formStyles.cardHeader}>
                        <strong>{note.title}</strong>
                        <Badge tone={note.category === 'premium' ? 'accent' : 'success'}>
                          {note.category === 'premium' ? formatPrice(note.price, note.currency) : 'Free'}
                        </Badge>
                      </div>
                      <p style={{ color: 'var(--ap-text-muted)', fontSize: '0.85rem' }}>{note.description}</p>
                      <p style={{ fontSize: '0.8rem' }}>
                        {note.track} · {note.fileName || 'no file uploaded yet'}
                      </p>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(note)}>
                        Delete
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            <h2 style={{ color: 'var(--ap-primary)', marginBottom: 'var(--ap-space-sm)' }}>Add a Note</h2>
            <form className={formStyles.form} onSubmit={handleSubmit}>
              <label>
                Title
                <input name="title" required value={form.title} onChange={handleChange} />
              </label>
              <label>
                Description
                <textarea name="description" rows="3" required value={form.description} onChange={handleChange} />
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
                  Category
                  <select name="category" value={form.category} onChange={handleChange}>
                    <option value="free">Free</option>
                    <option value="premium">Premium (paid)</option>
                  </select>
                </label>
              </div>

              {form.category === 'premium' && (
                <label>
                  Price (₹)
                  <input type="number" name="price" required min="1" value={form.price} onChange={handleChange} />
                </label>
              )}

              <label>
                File (PDF, DOC/DOCX, PPT/PPTX — up to 25MB)
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  required
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </label>

              <div className={formStyles.actions}>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Add Note'}
                </Button>
              </div>

              {formError && <p className={formStyles.errorMsg}>{formError}</p>}
            </form>
        </div>
      </DashboardLayout>
    </>
  );
}
