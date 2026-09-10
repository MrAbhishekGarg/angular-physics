import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { jobScheduleService } from '../../services/jobScheduleService.js';
import styles from './JobSchedule.module.css';

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

function Field({ label, wide, children }) {
  return (
    <div className={`${styles.field} ${wide ? styles.fieldWide : ''}`}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </div>
  );
}

function ManualClassForm({ defaultDate, onCreated }) {
  const [form, setForm] = useState({ date: defaultDate || '', startTime: '', endTime: '', room: '', batchCode: '', topicsCovered: '' });
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
    <form onSubmit={submit}>
      <div className={styles.fieldGrid}>
        <Field label="Date">
          <input className={styles.input} type="date" required value={form.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>
        <Field label="Batch code">
          <input className={styles.input} required value={form.batchCode} onChange={(e) => set({ batchCode: e.target.value })} placeholder="DRE" />
        </Field>
        <Field label="Start time">
          <input className={styles.input} required value={form.startTime} onChange={(e) => set({ startTime: e.target.value })} placeholder="1:10" />
        </Field>
        <Field label="End time">
          <input className={styles.input} value={form.endTime} onChange={(e) => set({ endTime: e.target.value })} placeholder="2:10" />
        </Field>
        <Field label="Room">
          <input className={styles.input} value={form.room} onChange={(e) => set({ room: e.target.value })} placeholder="8" />
        </Field>
        <Field label="Topics covered (optional)" wide>
          <input className={styles.input} value={form.topicsCovered} onChange={(e) => set({ topicsCovered: e.target.value })} />
        </Field>
      </div>
      <div className={styles.formActions}>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? 'Adding…' : 'Add class'}
        </Button>
      </div>
      {error && <p className={styles.feedbackErr}>{error}</p>}
    </form>
  );
}

function ClassCard({ cls, onSaved, onDeleted }) {
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
    <div className={styles.class}>
      <div className={styles.classHead}>
        <div>
          <span className={styles.classWhen}>
            {cls.startTime}
            {cls.endTime ? `–${cls.endTime}` : ''}
            <span className={styles.meta}>
              {' · '}Room {cls.room || '?'} · {cls.batchCode}
            </span>
          </span>
          {cls.subjectPrefix && <p className={styles.classSub}>{prettySubject(cls.subjectPrefix)}</p>}
        </div>
        <div className={styles.classTags}>
          {status === 'saving' && <span className={styles.tagMuted}>Saving…</span>}
          {status === 'saved' && <span className={styles.tagOk}>Saved ✓</span>}
          {cls.needsReview && <Badge tone="default">Needs review</Badge>}
          {cls.source === 'pdf' && cls.rawText && <span className={styles.tagMuted}>from PDF · {cls.rawText}</span>}
        </div>
      </div>

      <div className={styles.fieldGrid}>
        <Field label="Topics covered">
          <input
            className={styles.input}
            value={topicsCovered}
            onChange={(e) => setTopicsCovered(e.target.value)}
            onBlur={() => save()}
            placeholder="e.g. Terminal velocity, Poiseuille's equation"
          />
        </Field>
        <Field label="Notes">
          <input className={styles.input} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => save()} placeholder="optional" />
        </Field>
      </div>

      <div className={styles.formActions}>
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
        setUploadMessage("Image saved — add this day's classes below; it stays on the page for reference.");
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
        <div className={styles.wrap}>
          <h1>My Job — Schedule</h1>
          <p className={styles.lede}>
            Your Aakash classes, day by day. See the <Link to="/dashboard/mentor/admin/job">overview</Link> or{' '}
            <Link to="/dashboard/mentor/admin/job-schedule/batches">batch progress</Link>.
          </p>

          {!loading && !error && classes.length > 0 && (
            <p className={styles.summary}>
              Around this week: <strong>{weekStats.count}</strong> class{weekStats.count === 1 ? '' : 'es'} across{' '}
              <strong>{weekStats.batches}</strong> batch{weekStats.batches === 1 ? '' : 'es'}.
            </p>
          )}

          <div className={styles.panel}>
            <div className={styles.panelTitle}>Upload a schedule</div>
            <p className={styles.panelHint}>
              A <strong>PDF</strong> is read automatically — best-effort against a dense grid, so check anything flagged
              “Needs review”. An <strong>image</strong> can’t be auto-read: it’s kept here as a reference while you add
              that day’s classes by hand.
            </p>
            <div className={styles.uploadRow}>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  setFile(e.target.files[0] || null);
                  setImageDate('');
                }}
              />
              {fileIsImage && (
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Schedule date</span>
                  <input className={styles.input} type="date" value={imageDate} onChange={(e) => setImageDate(e.target.value)} required />
                </div>
              )}
              <Button type="button" size="sm" disabled={!file || (fileIsImage && !imageDate) || uploadBusy} onClick={handleUpload}>
                {uploadBusy ? 'Working…' : fileIsImage ? 'Save image' : 'Upload & extract'}
              </Button>
            </div>
            {(uploadMessage || uploadWarnings.length > 0) && (
              <div className={styles.feedback}>
                {uploadMessage && <p className={styles.feedbackOk}>{uploadMessage}</p>}
                {uploadFailed ? (
                  <p className={styles.feedbackErr}>{uploadWarnings[0]}</p>
                ) : (
                  uploadWarnings.length > 0 && (
                    <ul className={styles.warnList}>
                      {uploadWarnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div className={styles.panelTitle}>Add a class manually</div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowManual((v) => !v)}>
                {showManual ? 'Close' : 'Open'}
              </Button>
            </div>
            {showManual && <ManualClassForm defaultDate={manualDefaultDate} onCreated={handleCreated} />}
          </div>

          {needsReviewCount > 0 && (
            <div className={styles.reviewBanner}>
              {needsReviewCount} class{needsReviewCount === 1 ? ' needs' : 'es need'} review — check the times, rooms and batches below.
            </div>
          )}

          {loading && <Spinner />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && dayBlocks.length === 0 && (
            <p className={styles.empty}>Nothing yet — upload a schedule above, or add a class by hand.</p>
          )}

          {!loading &&
            !error &&
            dayBlocks.map(({ date, classes: dayClasses, upload }) => {
              const rel = relativeDay(date);
              return (
                <section key={date} className={styles.day}>
                  <div className={styles.dayHead}>
                    <h2 className={styles.dayTitle}>
                      {rel && <span className={styles.dayRel}>{rel} · </span>}
                      {formatDate(date)}
                      {dayClasses.length === 0 && <span className={styles.dayEmpty}> — no classes added yet</span>}
                    </h2>
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
                        Delete upload
                      </Button>
                    )}
                  </div>

                  {upload?.isImage && (
                    <a href={jobScheduleService.fileUrl(upload._id)} target="_blank" rel="noreferrer">
                      <img src={jobScheduleService.fileUrl(upload._id)} alt="Schedule" className={styles.refImg} />
                    </a>
                  )}

                  {dayClasses.map((cls) => (
                    <ClassCard key={cls._id} cls={cls} onSaved={handleSaved} onDeleted={handleDeleted} />
                  ))}
                </section>
              );
            })}
        </div>
      </DashboardLayout>
    </>
  );
}
