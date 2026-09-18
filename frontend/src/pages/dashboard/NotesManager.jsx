import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import { useNotes } from '../../hooks/useNotes.js';
import { noteService } from '../../services/noteService.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useMentorCourses } from '../../hooks/useCourses.js';
import { useStudentBatches } from '../../hooks/useStudentBatches.js';
import CheckboxAssignPanel, { idOf } from '../../components/dashboard/CheckboxAssignPanel.jsx';
import PublishTargetFields from '../../components/dashboard/PublishTargetFields.jsx';
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
  const { user } = useAuth();
  const canManagePaid = user?.canManagePaidContent !== false;
  const { data: notes, loading, error, refetch } = useNotes();
  const { data: courses } = useMentorCourses();
  const { data: batches } = useStudentBatches();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const totalPages = notes ? Math.max(1, Math.ceil(notes.length / PAGE_SIZE)) : 1;
  const pagedNotes = notes ? notes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];
  const [form, setForm] = useState(emptyForm);
  const [sourceMode, setSourceMode] = useState('upload');
  const [file, setFile] = useState(null);
  const [driveUrl, setDriveUrl] = useState('');
  const [publishCourseIds, setPublishCourseIds] = useState([]);
  const [publishBatchIds, setPublishBatchIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [courseExpandedId, setCourseExpandedId] = useState(null);
  const [batchExpandedId, setBatchExpandedId] = useState(null);

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
      if (sourceMode === 'upload' && file) await noteService.uploadFile(note._id, file);
      if (sourceMode === 'drive' && driveUrl.trim()) await noteService.setDriveLink(note._id, driveUrl.trim());
      if (publishCourseIds.length > 0) await noteService.assignCourses(note._id, publishCourseIds);
      if (publishBatchIds.length > 0) await noteService.assignBatches(note._id, publishBatchIds);
      setForm(emptyForm);
      setFile(null);
      setDriveUrl('');
      setPublishCourseIds([]);
      setPublishBatchIds([]);
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
                  pagedNotes.map((note) => (
                    <div key={note._id} className={formStyles.card}>
                      <div className={formStyles.cardHeader}>
                        <strong>{note.title}</strong>
                        <Badge tone={note.category === 'premium' ? 'accent' : 'success'}>
                          {note.category === 'premium' ? formatPrice(note.price, note.currency) : 'Free'}
                        </Badge>
                      </div>
                      <p style={{ color: 'var(--ap-text-muted)', fontSize: '0.85rem' }}>{note.description}</p>
                      <p style={{ fontSize: '0.8rem' }}>
                        {note.track} ·{' '}
                        {note.source === 'drive' && note.driveUrl ? (
                          <a href={note.driveUrl} target="_blank" rel="noreferrer">
                            Google Drive link
                          </a>
                        ) : (
                          note.fileName || 'no file uploaded yet'
                        )}
                      </p>
                      <p style={{ fontSize: '0.8rem' }}>
                        Courses:{' '}
                        {(note.courseIds || []).length === 0
                          ? 'none (visible to all students)'
                          : note.courseIds.map((c) => c.title || c).join(', ')}
                      </p>
                      <p style={{ fontSize: '0.8rem' }}>
                        Batches:{' '}
                        {(note.batchIds || []).length === 0
                          ? 'none (visible to all students)'
                          : note.batchIds.map((b) => b.name || b).join(', ')}
                      </p>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setCourseExpandedId((id) => (id === note._id ? null : note._id));
                            setBatchExpandedId(null);
                          }}
                        >
                          {courseExpandedId === note._id ? 'Close' : 'Assign to Course(s)'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setBatchExpandedId((id) => (id === note._id ? null : note._id));
                            setCourseExpandedId(null);
                          }}
                        >
                          {batchExpandedId === note._id ? 'Close' : 'Assign to Batch(es)'}
                        </Button>
                        {(note.category !== 'premium' || canManagePaid) && (
                          <Button size="sm" variant="danger" onClick={() => handleDelete(note)}>
                            Delete
                          </Button>
                        )}
                      </div>

                      {courseExpandedId === note._id && (
                        <CheckboxAssignPanel
                          initialSelectedIds={(note.courseIds || []).map(idOf)}
                          options={courses}
                          labelKey="title"
                          onSave={async (selected) => {
                            await noteService.assignCourses(note._id, selected);
                            await refetch();
                          }}
                        />
                      )}
                      {batchExpandedId === note._id && (
                        <CheckboxAssignPanel
                          initialSelectedIds={(note.batchIds || []).map(idOf)}
                          options={batches}
                          labelKey="name"
                          onSave={async (selected) => {
                            await noteService.assignBatches(note._id, selected);
                            await refetch();
                          }}
                        />
                      )}
                    </div>
                  ))
                )}
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
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
                    <option value="premium" disabled={!canManagePaid}>
                      Premium (paid)
                    </option>
                  </select>
                </label>
              </div>
              {!canManagePaid && (
                <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)', marginTop: '-0.5rem' }}>
                  You don't have permission to manage paid content — ask an admin for access.
                </p>
              )}

              {form.category === 'premium' && (
                <label>
                  Price (₹)
                  <input type="number" name="price" required min="1" value={form.price} onChange={handleChange} />
                </label>
              )}

              <div className={formStyles.row} role="radiogroup" aria-label="Note source">
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem', fontWeight: 400 }}>
                  <input type="radio" name="sourceMode" checked={sourceMode === 'upload'} onChange={() => setSourceMode('upload')} />
                  Upload a file
                </label>
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem', fontWeight: 400 }}>
                  <input type="radio" name="sourceMode" checked={sourceMode === 'drive'} onChange={() => setSourceMode('drive')} />
                  Link a Google Drive file
                </label>
              </div>

              {sourceMode === 'upload' ? (
                <label>
                  File (PDF, DOC/DOCX, PPT/PPTX — up to 25MB)
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    required
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                </label>
              ) : (
                <label>
                  Google Drive share link (set to "Anyone with the link can view")
                  <input
                    type="url"
                    required
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/.../view"
                  />
                </label>
              )}

              <PublishTargetFields
                courses={courses}
                batches={batches}
                selectedCourseIds={publishCourseIds}
                selectedBatchIds={publishBatchIds}
                onCourseIdsChange={setPublishCourseIds}
                onBatchIdsChange={setPublishBatchIds}
              />

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
