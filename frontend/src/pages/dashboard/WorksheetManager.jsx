import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useWorksheets } from '../../hooks/useWorksheets.js';
import { useCourses } from '../../hooks/useCourses.js';
import { useWorksheetProgress } from '../../hooks/useWorksheetProgress.js';
import { worksheetService } from '../../services/worksheetService.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import formStyles from './DashboardForm.module.css';
import dashboardStyles from './Dashboard.module.css';

const emptyForm = { title: '', type: 'dpp', examType: EXAM_TRACKS[0].key, chapter: '', topic: '', deadlineAt: '' };

function AssignPanel({ worksheet, courses, onAssigned }) {
  const [selected, setSelected] = useState((worksheet.courseIds || []).map((c) => (typeof c === 'string' ? c : c._id)));
  const [busy, setBusy] = useState(false);

  const toggle = (courseId) => {
    setSelected((ids) => (ids.includes(courseId) ? ids.filter((id) => id !== courseId) : [...ids, courseId]));
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await worksheetService.assign(worksheet._id, selected);
      await onAssigned();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {(courses || []).map((c) => (
          <label key={c._id} className={formStyles.checkboxLabel} style={{ fontWeight: 400, fontSize: '0.85rem' }}>
            <input type="checkbox" checked={selected.includes(c._id)} onChange={() => toggle(c._id)} />
            {c.title}
          </label>
        ))}
      </div>
      <Button size="sm" disabled={busy} onClick={handleSave} style={{ marginTop: '0.4rem' }}>
        {busy ? 'Saving…' : 'Save Assignment'}
      </Button>
    </div>
  );
}

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
  const { data: courses } = useCourses();
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
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
      if (file) await worksheetService.uploadFile(worksheet._id, file);
      setForm(emptyForm);
      setFile(null);
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
                  worksheets.map((w) => (
                    <div key={w._id} className={formStyles.card}>
                      <div className={formStyles.cardHeader}>
                        <strong>{w.title}</strong>
                        <Badge tone={w.type === 'dpp' ? 'accent' : 'launching'}>{w.type === 'dpp' ? 'DPP' : 'Assignment'}</Badge>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>
                        {w.examType || '—'} {w.chapter ? `· ${w.chapter}` : ''} · {w.fileName || 'no file uploaded yet'}
                      </p>
                      <p style={{ fontSize: '0.8rem' }}>
                        Assigned to: {(w.courseIds || []).length === 0 ? 'none' : w.courseIds.map((c) => c.title || courseTitleById[c]).join(', ')}
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
                        <Button size="sm" variant="ghost" onClick={() => setExpandedId((id) => (id === w._id ? null : w._id))}>
                          {expandedId === w._id ? 'Close' : 'Assign to Course(s)'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setStatusOpenId((id) => (id === w._id ? null : w._id))}>
                          {statusOpenId === w._id ? 'Close' : 'Student Status'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(w)}>
                          Delete
                        </Button>
                      </div>

                      {expandedId === w._id && <AssignPanel worksheet={w} courses={courses} onAssigned={refetch} />}
                      {statusOpenId === w._id && <StatusPanel worksheetId={w._id} />}
                    </div>
                  ))
                )}
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
                    <option value="dpp">DPP (Daily Practice Problem)</option>
                    <option value="assignment">Assignment</option>
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

              <label>
                PDF file (up to 25MB)
                <input type="file" accept=".pdf" required onChange={(e) => setFile(e.target.files[0])} />
              </label>

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
