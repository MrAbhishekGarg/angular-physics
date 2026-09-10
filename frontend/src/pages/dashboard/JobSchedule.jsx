import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { jobScheduleService } from '../../services/jobScheduleService.js';
import formStyles from './DashboardForm.module.css';

const DAY_MS = 24 * 60 * 60 * 1000;

function utcMidnight(dateStr) {
  const d = new Date(dateStr);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function todayUtcMidnight() {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
}

function relativeDay(dateStr) {
  const diff = Math.round((utcMidnight(dateStr) - todayUtcMidnight()) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return null;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Existing rows may hold a bare "P" or a shouty "PHYSICS" from before the
// backend started expanding the prefix — normalise both to "Physics".
const SUBJECT_LABELS = { p: 'Physics', c: 'Chemistry', b: 'Biology', z: 'Zoology', m: 'Mathematics', mat: 'Mathematics' };
function prettySubject(s) {
  if (!s) return '';
  const key = s.trim().toLowerCase();
  return SUBJECT_LABELS[key] || s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function groupByDate(classes) {
  const groups = new Map();
  classes.forEach((c) => {
    if (!groups.has(c.date)) groups.set(c.date, []);
    groups.get(c.date).push(c);
  });
  return [...groups.entries()].sort((a, b) => new Date(b[0]) - new Date(a[0]));
}

function ManualClassForm({ defaultDate, onCreated }) {
  const [form, setForm] = useState({
    date: defaultDate || '',
    startTime: '',
    endTime: '',
    room: '',
    batchCode: '',
    topicsCovered: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (defaultDate) setForm((f) => ({ ...f, date: defaultDate }));
  }, [defaultDate]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const created = await jobScheduleService.createClass(form);
      onCreated(created);
      set({ startTime: '', endTime: '', room: '', batchCode: '', topicsCovered: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={formStyles.form} onSubmit={submit}>
      <div className={formStyles.row}>
        <label>
          Date
          <input type="date" required value={form.date} onChange={(e) => set({ date: e.target.value })} />
        </label>
        <label>
          Batch code
          <input required value={form.batchCode} onChange={(e) => set({ batchCode: e.target.value })} placeholder="e.g. DRE" />
        </label>
      </div>
      <div className={formStyles.row}>
        <label>
          Start time
          <input required value={form.startTime} onChange={(e) => set({ startTime: e.target.value })} placeholder="e.g. 1:10" />
        </label>
        <label>
          End time
          <input value={form.endTime} onChange={(e) => set({ endTime: e.target.value })} placeholder="e.g. 2:10" />
        </label>
      </div>
      <div className={formStyles.row}>
        <label>
          Room
          <input value={form.room} onChange={(e) => set({ room: e.target.value })} placeholder="e.g. 8" />
        </label>
        <label>
          Topics covered (optional)
          <input value={form.topicsCovered} onChange={(e) => set({ topicsCovered: e.target.value })} />
        </label>
      </div>
      <div className={formStyles.actions}>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? 'Adding…' : 'Add class'}
        </Button>
      </div>
      {error && <p className={formStyles.errorMsg}>{error}</p>}
    </form>
  );
}

function ClassRow({ cls, onSaved, onDeleted }) {
  const [topicsCovered, setTopicsCovered] = useState(cls.topicsCovered || '');
  const [notes, setNotes] = useState(cls.notes || '');
  const [status, setStatus] = useState(''); // '' | 'saving' | 'saved'

  const save = async (extra = {}) => {
    setStatus('saving');
    try {
      const updated = await jobScheduleService.updateClass(cls._id, { topicsCovered, notes, ...extra });
      onSaved(updated);
      setStatus('saved');
      setTimeout(() => setStatus(''), 1500);
    } catch {
      setStatus('');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this class entry?')) return;
    await jobScheduleService.removeClass(cls._id);
    onDeleted(cls._id);
  };

  return (
    <div className={formStyles.card} style={{ marginBottom: '0.6rem' }}>
      <div className={formStyles.cardHeader}>
        <strong>
          {cls.startTime}
          {cls.endTime ? `–${cls.endTime}` : ''} · Room {cls.room || '?'} · {cls.batchCode}
          {cls.subjectPrefix && (
            <span style={{ fontWeight: 400, color: 'var(--ap-text-muted)' }}> · {prettySubject(cls.subjectPrefix)}</span>
          )}
        </strong>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {status === 'saving' && <span style={{ fontSize: '0.72rem', color: 'var(--ap-text-muted)' }}>Saving…</span>}
          {status === 'saved' && <span style={{ fontSize: '0.72rem', color: 'var(--ap-success)' }}>Saved ✓</span>}
          {cls.needsReview && <Badge tone="default">Needs review</Badge>}
          {cls.source === 'pdf' && (
            <span style={{ fontSize: '0.72rem', color: 'var(--ap-text-muted)' }}>from PDF ({cls.rawText})</span>
          )}
        </div>
      </div>
      <div className={formStyles.row}>
        <label>
          Topics covered
          <input
            value={topicsCovered}
            onChange={(e) => setTopicsCovered(e.target.value)}
            onBlur={() => save()}
            placeholder="e.g. Electric dipole in uniform field"
          />
        </label>
        <label>
          Notes
          <input value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => save()} placeholder="optional" />
        </label>
      </div>
      <div className={formStyles.actions} style={{ marginTop: '0.4rem' }}>
        {cls.needsReview && (
          <Button type="button" size="sm" variant="ghost" onClick={() => save({ needsReview: false })}>
            Looks good
          </Button>
        )}
        <Button type="button" size="sm" variant="danger" onClick={handleDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}

export default function JobSchedule() {
  const [classes, setClasses] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [file, setFile] = useState(null);
  const [imageDate, setImageDate] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadWarnings, setUploadWarnings] = useState([]);
  const [uploadFailed, setUploadFailed] = useState(false);

  const [showManual, setShowManual] = useState(false);
  const [manualDefaultDate, setManualDefaultDate] = useState('');

  const fileIsImage = file && file.type.startsWith('image/');

  const refetch = async () => {
    setLoading(true);
    setError('');
    try {
      const [c, u] = await Promise.all([jobScheduleService.listClasses(), jobScheduleService.listUploads()]);
      setClasses(c);
      setUploads(u);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    if (fileIsImage && !imageDate) return;
    setUploadBusy(true);
    setUploadMessage('');
    setUploadWarnings([]);
    setUploadFailed(false);
    try {
      const { classes: created, warnings } = await jobScheduleService.uploadFile(file, fileIsImage ? imageDate : undefined);
      if (fileIsImage) {
        setUploadMessage('Image saved. Add this day\'s classes below — it\'ll show alongside the form.');
        setManualDefaultDate(imageDate);
        setShowManual(true);
      } else {
        setUploadMessage(`Extracted ${created.length} class${created.length === 1 ? '' : 'es'}.`);
      }
      setUploadWarnings(warnings);
      setFile(null);
      setImageDate('');
      await refetch();
    } catch (err) {
      setUploadWarnings([err.message]);
      setUploadFailed(true);
    } finally {
      setUploadBusy(false);
    }
  };

  const handleSaved = (updated) => setClasses((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
  const handleDeleted = (id) => setClasses((prev) => prev.filter((c) => c._id !== id));
  const handleCreated = (created) => setClasses((prev) => [...prev, created]);

  const needsReviewCount = classes.filter((c) => c.needsReview).length;

  // One block per date, newest first — merges classes (grouped by their
  // date) with any upload for that date, so an image day with no classes
  // added yet still shows up with its reference image.
  const dayBlocks = useMemo(() => {
    const byDate = new Map();
    groupByDate(classes).forEach(([date, dayClasses]) => byDate.set(new Date(date).toISOString(), { date, classes: dayClasses, upload: null }));
    uploads.forEach((u) => {
      const key = new Date(u.date).toISOString();
      if (byDate.has(key)) byDate.get(key).upload = u;
      else byDate.set(key, { date: u.date, classes: [], upload: u });
    });
    return [...byDate.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [classes, uploads]);

  const weekStats = useMemo(() => {
    const start = todayUtcMidnight() - 3 * DAY_MS;
    const end = todayUtcMidnight() + 4 * DAY_MS;
    const inWindow = classes.filter((c) => {
      const t = utcMidnight(c.date);
      return t >= start && t < end;
    });
    return { count: inWindow.length, batches: new Set(inWindow.map((c) => c.batchCode)).size };
  }, [classes]);

  return (
    <>
      <SEO title="My Job — Schedule" description="Personal Aakash class schedule tracking." path="/dashboard/mentor/admin/job-schedule" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <h1>My Job — Schedule</h1>
          <p style={{ color: 'var(--ap-text-muted)' }}>
            Your Aakash classes, from the daily schedule. Not part of the Angular Physics business —{' '}
            <Link to="/dashboard/mentor/admin/job-schedule/batches">see batch progress</Link>.
          </p>

          {!loading && !error && classes.length > 0 && (
            <p style={{ fontSize: '0.9rem', color: 'var(--ap-text-muted)' }}>
              Around this week: <strong>{weekStats.count}</strong> class{weekStats.count === 1 ? '' : 'es'} across{' '}
              <strong>{weekStats.batches}</strong> batch{weekStats.batches === 1 ? '' : 'es'}.
            </p>
          )}

          <div className={formStyles.card}>
            <strong>Upload today's schedule</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)', margin: '0.3rem 0' }}>
              A <strong>PDF</strong> is read automatically — best-effort against a dense grid, so check anything flagged
              "Needs review". An <strong>image</strong> can't be auto-read: it's kept on this page as a reference while
              you add that day's classes by hand. Set up the Zapier bridge to skip PDF uploads entirely.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  setFile(e.target.files[0] || null);
                  setImageDate('');
                }}
                style={{ flex: 1, minWidth: 200 }}
              />
              {fileIsImage && (
                <label style={{ fontSize: '0.8rem' }}>
                  Schedule date{' '}
                  <input type="date" value={imageDate} onChange={(e) => setImageDate(e.target.value)} required />
                </label>
              )}
              <Button type="button" size="sm" disabled={!file || (fileIsImage && !imageDate) || uploadBusy} onClick={handleUpload}>
                {uploadBusy ? 'Working…' : fileIsImage ? 'Save image' : 'Upload & Extract'}
              </Button>
            </div>
            {(uploadMessage || uploadWarnings.length > 0) && (
              <div style={{ marginTop: '0.5rem' }}>
                {uploadMessage && <p style={{ color: 'var(--ap-success)', fontSize: '0.85rem' }}>{uploadMessage}</p>}
                {uploadFailed ? (
                  <p className={formStyles.errorMsg}>{uploadWarnings[0]}</p>
                ) : (
                  uploadWarnings.length > 0 && (
                    <ul style={{ color: 'var(--ap-warning)', fontSize: '0.8rem', paddingLeft: '1.2rem' }}>
                      {uploadWarnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            )}
          </div>

          <div className={formStyles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <strong>Add a class manually</strong>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowManual((v) => !v)}>
                {showManual ? 'Close' : 'Open'}
              </Button>
            </div>
            {showManual && <ManualClassForm defaultDate={manualDefaultDate} onCreated={handleCreated} />}
          </div>

          {needsReviewCount > 0 && (
            <p style={{ color: 'var(--ap-warning)', fontWeight: 600, fontSize: '0.9rem' }}>
              {needsReviewCount} class{needsReviewCount === 1 ? '' : 'es'} need review.
            </p>
          )}

          {loading && <Spinner />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && dayBlocks.length === 0 && (
            <p style={{ color: 'var(--ap-text-muted)' }}>Nothing yet — upload a schedule above, or add a class by hand.</p>
          )}
          {!loading &&
            !error &&
            dayBlocks.map(({ date, classes: dayClasses, upload }) => {
              const rel = relativeDay(date);
              return (
                <div key={date} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <h3 style={{ marginBottom: '0.4rem' }}>
                      {rel && <span style={{ color: 'var(--ap-accent)' }}>{rel} · </span>}
                      {formatDate(date)}
                      {dayClasses.length === 0 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}> — no classes added yet</span>
                      )}
                    </h3>
                    {upload && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!window.confirm("Delete this day's upload and every class from it?")) return;
                          await jobScheduleService.removeUpload(upload._id);
                          await refetch();
                        }}
                      >
                        Delete this upload
                      </Button>
                    )}
                  </div>
                  {upload?.isImage && (
                    <a href={jobScheduleService.fileUrl(upload._id)} target="_blank" rel="noreferrer">
                      <img
                        src={jobScheduleService.fileUrl(upload._id)}
                        alt="Schedule"
                        style={{ maxWidth: '100%', border: '1px solid var(--ap-border)', borderRadius: 6, marginBottom: '0.6rem' }}
                      />
                    </a>
                  )}
                  {dayClasses.map((cls) => (
                    <ClassRow key={cls._id} cls={cls} onSaved={handleSaved} onDeleted={handleDeleted} />
                  ))}
                </div>
              );
            })}
        </div>
      </DashboardLayout>
    </>
  );
}
