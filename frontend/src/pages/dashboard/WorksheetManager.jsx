import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import { useWorksheets } from '../../hooks/useWorksheets.js';
import { useMentorCourses } from '../../hooks/useCourses.js';
import { useStudentBatches } from '../../hooks/useStudentBatches.js';
import { useWorksheetProgress } from '../../hooks/useWorksheetProgress.js';
import CheckboxAssignPanel, { idOf } from '../../components/dashboard/CheckboxAssignPanel.jsx';
import { worksheetService } from '../../services/worksheetService.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import { WORKSHEET_TYPES, WORKSHEET_TYPE_LABEL, WORKSHEET_TYPE_TONE } from '../../data/worksheetTypes.js';
import formStyles from './DashboardForm.module.css';
import dashboardStyles from './Dashboard.module.css';

const emptyForm = { title: '', type: 'dpp', examType: EXAM_TRACKS[0].key, chapter: '', topic: '', deadlineAt: '' };
const PAGE_SIZE = 20;

function StatusPanel({ worksheetId }) {
  const { data: progress, loading, error } = useWorksheetProgress(worksheetId, true);

  if (loading) return <Spinner label="Loading student status…" />;
  if (error) return <ErrorState message={error} />;
  if (!progress || progress.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)' }}>No enrolled students yet.</p>;
  }

  return (
    <div className={dashboardStyles.tableWrap} style={{ marginTop: '0.5rem' }}>
      <table className={dashboardStyles.table}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Downloaded</th>
            <th>Completed</th>
            <th>Doubt</th>
          </tr>
        </thead>
        <tbody>
          {progress.map((p) => (
            <tr key={p.studentId}>
              <td>
                {p.name}
                <br />
                <span style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{p.email}</span>
              </td>
              <td>
                <Badge tone={p.downloadedAt ? 'success' : 'default'}>{p.downloadedAt ? 'Yes' : 'No'}</Badge>
              </td>
              <td>
                <Badge tone={p.completedAt ? 'success' : 'default'}>{p.completedAt ? 'Yes' : 'No'}</Badge>
              </td>
              <td>
                {p.doubtStatus ? (
                  <Badge tone={p.doubtStatus === 'open' ? 'accent' : p.doubtStatus === 'answered' ? 'success' : 'default'}>
                    {p.doubtStatus}
                  </Badge>
                ) : (
                  <span style={{ color: 'var(--ap-text-muted)', fontSize: '0.85rem' }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WorksheetManager() {
  const { data: worksheets, loading, error, refetch } = useWorksheets();
  const { data: courses } = useMentorCourses();
  const { data: batches } = useStudentBatches();
  const [page, setPage] = useState(1);
  const totalPages = worksheets ? Math.max(1, Math.ceil(worksheets.length / PAGE_SIZE)) : 1;
  const pagedWorksheets = worksheets ? worksheets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];
  const [form, setForm] = useState(emptyForm);
  const [sourceMode, setSourceMode] = useState('upload');
  const [file, setFile] = useState(null);
  const [driveUrl, setDriveUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [batchExpandedId, setBatchExpandedId] = useState(null);
  const [statusOpenId, setStatusOpenId] = useState(null);

  const courseTitleById = Object.fromEntries((courses || []).map((c) => [c._id, c.title]));

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const payload = { ...form, deadlineAt: form.deadlineAt || null };
      const worksheet = await worksheetService.create(payload);
      if (sourceMode === 'upload' && file) await worksheetService.uploadFile(worksheet._id, file);
      if (sourceMode === 'drive' && driveUrl.trim()) await worksheetService.setDriveLink(worksheet._id, driveUrl.trim());
      setForm(emptyForm);
      setFile(null);
      setDriveUrl('');
      await refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (worksheet) => {
    if (!window.confirm(`Delete "${worksheet.title}"?`)) return;
    await worksheetService.remove(worksheet._id);
    await refetch();
  };

  return (
    <>
      <SEO title="Manage Worksheets" description="Upload and assign DPP/Assignment PDFs to courses." path="/dashboard/mentor/worksheets" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 1000 }}>
          <h1>Manage Worksheets (DPPs & Assignments)</h1>
            <p style={{ color: 'var(--ap-text-muted)' }}>
              DPPs and Assignments are plain downloadable PDFs, not online tests. Students download them from their
              dashboard.
            </p>

            {loading && <Spinner label="Loading worksheets…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}

            {worksheets && (
              <div style={{ marginBottom: 'var(--ap-space-lg)' }}>
                {worksheets.length === 0 ? (
                  <p style={{ color: 'var(--ap-text-muted)' }}>No worksheets uploaded yet.</p>
                ) : (
                  pagedWorksheets.map((w) => (
                    <div key={w._id} className={formStyles.card}>
                      <div className={formStyles.cardHeader}>
                        <strong>{w.title}</strong>
                        <Badge tone={WORKSHEET_TYPE_TONE[w.type]}>{WORKSHEET_TYPE_LABEL[w.type]}</Badge>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>
                        {w.examType || '—'} {w.chapter ? `· ${w.chapter}` : ''} ·{' '}
                        {w.source === 'drive' && w.driveUrl ? (
                          <a href={w.driveUrl} target="_blank" rel="noreferrer">
                            Google Drive link
                          </a>
                        ) : (
                          w.fileName || 'no file uploaded yet'
                        )}
                      </p>
                      <p style={{ fontSize: '0.8rem' }}>
                        Courses: {(w.courseIds || []).length === 0 ? 'none' : w.courseIds.map((c) => c.title || courseTitleById[c]).join(', ')}
                      </p>
                      <p style={{ fontSize: '0.8rem' }}>
                        Batches: {(w.batchIds || []).length === 0 ? 'none' : w.batchIds.map((b) => b.name || b).join(', ')}
                      </p>
                      <p style={{ fontSize: '0.8rem' }}>
                        Deadline:{' '}
                        {w.deadlineAt ? (
                          <Badge tone={new Date(w.deadlineAt) < new Date() ? 'accent' : 'highlight'}>
                            {new Date(w.deadlineAt).toLocaleString()}
                          </Badge>
                        ) : (
                          <span style={{ color: 'var(--ap-text-muted)' }}>none — always available</span>
                        )}
                      </p>

                      {w.usageHistory && w.usageHistory.length > 0 && (
                        <details style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>
                          <summary style={{ cursor: 'pointer' }}>Usage history ({w.usageHistory.length})</summary>
                          <ul style={{ margin: '0.3rem 0 0', paddingLeft: '1.1rem' }}>
                            {w.usageHistory.map((h) => (
                              <li key={h._id}>
                                {courseTitleById[h.courseId?._id || h.courseId] || 'Unknown course'} —{' '}
                                {new Date(h.assignedAt).toLocaleDateString()}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}

                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setExpandedId((id) => (id === w._id ? null : w._id));
                            setBatchExpandedId(null);
                          }}
                        >
                          {expandedId === w._id ? 'Close' : 'Assign to Course(s)'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setBatchExpandedId((id) => (id === w._id ? null : w._id));
                            setExpandedId(null);
                          }}
                        >
                          {batchExpandedId === w._id ? 'Close' : 'Assign to Batch(es)'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setStatusOpenId((id) => (id === w._id ? null : w._id))}>
                          {statusOpenId === w._id ? 'Close' : 'Student Status'}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(w)}>
                          Delete
                        </Button>
                      </div>

                      {expandedId === w._id && (
                        <CheckboxAssignPanel
                          initialSelectedIds={(w.courseIds || []).map(idOf)}
                          options={courses}
                          labelKey="title"
                          onSave={async (selected) => {
                            await worksheetService.assign(w._id, selected);
                            await refetch();
                          }}
                        />
                      )}
                      {batchExpandedId === w._id && (
                        <CheckboxAssignPanel
                          initialSelectedIds={(w.batchIds || []).map(idOf)}
                          options={batches}
                          labelKey="name"
                          onSave={async (selected) => {
                            await worksheetService.assignBatches(w._id, selected);
                            await refetch();
                          }}
                        />
                      )}
                      {statusOpenId === w._id && <StatusPanel worksheetId={w._id} />}
                    </div>
                  ))
                )}
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            )}

            <h2 style={{ color: 'var(--ap-primary)', marginBottom: 'var(--ap-space-sm)' }}>Upload a Worksheet</h2>
            <form className={formStyles.form} onSubmit={handleSubmit}>
              <label>
                Title
                <input name="title" required value={form.title} onChange={handleChange} />
              </label>

              <div className={formStyles.row}>
                <label>
                  Type
                  <select name="type" value={form.type} onChange={handleChange}>
                    {WORKSHEET_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Exam type
                  <select name="examType" value={form.examType} onChange={handleChange}>
                    {EXAM_TRACKS.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={formStyles.row}>
                <label>
                  Chapter (optional)
                  <input name="chapter" value={form.chapter} onChange={handleChange} />
                </label>
                <label>
                  Topic (optional)
                  <input name="topic" value={form.topic} onChange={handleChange} />
                </label>
              </div>

              <label>
                Deadline (optional — leave blank for no deadline)
                <input type="datetime-local" name="deadlineAt" value={form.deadlineAt} onChange={handleChange} />
              </label>

              <div className={formStyles.row} role="radiogroup" aria-label="Worksheet source">
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem', fontWeight: 400 }}>
                  <input type="radio" name="wsSourceMode" checked={sourceMode === 'upload'} onChange={() => setSourceMode('upload')} />
                  Upload a file
                </label>
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem', fontWeight: 400 }}>
                  <input type="radio" name="wsSourceMode" checked={sourceMode === 'drive'} onChange={() => setSourceMode('drive')} />
                  Link a Google Drive file
                </label>
              </div>

              {sourceMode === 'upload' ? (
                <label>
                  PDF file (up to 25MB)
                  <input type="file" accept=".pdf" required onChange={(e) => setFile(e.target.files[0])} />
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

              <div className={formStyles.actions}>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Upload Worksheet'}
                </Button>
              </div>

              {formError && <p className={formStyles.errorMsg}>{formError}</p>}
            </form>
        </div>
      </DashboardLayout>
    </>
  );
}
