import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import BatchChip from '../../components/dashboard/BatchChip.jsx';
import { batchColor, batchOrder } from '../../data/batchColors.js';
import { formatTimeRange } from '../../data/classTime.js';
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
function isToday(dateStr) {
  return utcMidnight(dateStr) === todayUtcMidnight();
}
// A class's workflow state — the day arriving (today counts) makes it
// "done", then the mentor's post-class review moves it to "taught".
function classState(cls) {
  if (utcMidnight(cls.date) > todayUtcMidnight()) return 'upcoming';
  return cls.reviewed ? 'taught' : 'toReview';
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
  const [form, setForm] = useState({ date: defaultDate || '', startTime: '', endTime: '', room: '', batchCode: '', plannedTopics: '', isDoubt: false });
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
      set({ startTime: '', endTime: '', room: '', batchCode: '', plannedTopics: '', isDoubt: false });
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
        <Field label="Topics to be taught (optional)" wide>
          <input className={styles.input} value={form.plannedTopics} onChange={(e) => set({ plannedTopics: e.target.value })} />
        </Field>
      </div>
      <label className={styles.checkboxRow}>
        <input type="checkbox" checked={form.isDoubt} onChange={(e) => set({ isDoubt: e.target.checked })} />
        Doubt class
      </label>
      <div className={styles.formActions}>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? 'Adding…' : 'Add class'}
        </Button>
      </div>
      {error && <p className={styles.feedbackErr}>{error}</p>}
    </form>
  );
}

function ClassCard({ cls, order, onSaved, onDeleted }) {
  const state = classState(cls); // 'upcoming' | 'toReview' | 'taught'
  const [plannedTopics, setPlannedTopics] = useState(cls.plannedTopics || '');
  // On review, start from the plan so the mentor edits it down to what
  // actually happened rather than retyping.
  const [topicsCovered, setTopicsCovered] = useState(cls.topicsCovered || (state === 'toReview' ? cls.plannedTopics || '' : ''));
  const [notes, setNotes] = useState(cls.notes || '');
  const [status, setStatus] = useState(''); // '' | 'saving' | 'saved'

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  const save = async (extra = {}) => {
    setStatus('saving');
    try {
      const updated = await jobScheduleService.updateClass(cls._id, { plannedTopics, topicsCovered, notes, ...extra });
      onSaved(updated);
      setStatus('saved');
      setTimeout(() => setStatus(''), 1500);
    } catch {
      setStatus('');
    }
  };

  const startEdit = () => {
    setEditError('');
    setEditForm({
      date: new Date(cls.date).toISOString().slice(0, 10),
      batchCode: cls.batchCode,
      startTime: cls.startTime,
      endTime: cls.endTime || '',
      room: cls.room || '',
      isDoubt: !!cls.isDoubt,
    });
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setEditBusy(true);
    setEditError('');
    try {
      const updated = await jobScheduleService.updateClass(cls._id, editForm);
      onSaved(updated);
      setEditing(false);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this class entry?')) return;
    await jobScheduleService.removeClass(cls._id);
    onDeleted(cls._id);
  };

  return (
    <div
      className={`${styles.class} ${state === 'taught' ? styles.classDone : ''}`}
      style={{ borderLeft: `4px solid ${batchColor(cls.batchCode, order)}` }}
    >
      <div className={styles.classHead}>
        <div className={styles.classWhenWrap}>
          <span className={styles.classWhen}>
            {formatTimeRange(cls.startTime, cls.endTime)}
            <span className={styles.meta}>{' · '}Room {cls.room || '?'}</span>
          </span>
          <BatchChip code={cls.batchCode} order={order} />
          {cls.isDoubt && <Badge tone="default">Doubt</Badge>}
          {cls.subjectPrefix && <span className={styles.classSub}>{prettySubject(cls.subjectPrefix)}</span>}
        </div>
        <div className={styles.classTags}>
          {status === 'saving' && <span className={styles.tagMuted}>Saving…</span>}
          {status === 'saved' && <span className={styles.tagOk}>Saved ✓</span>}
          {isToday(cls.date) && <span className={styles.phaseToday}>Today</span>}
          {state === 'upcoming' && <span className={styles.phaseUpcoming}>Upcoming</span>}
          {state === 'toReview' && <span className={styles.phaseReview}>Review</span>}
          {state === 'taught' && <span className={styles.phaseTaught}>✓ Taught</span>}
          {cls.needsReview && <Badge tone="default">Check details</Badge>}
          {cls.source === 'pdf' && cls.rawText && <span className={styles.tagMuted}>from PDF · {cls.rawText}</span>}
          <button type="button" className={styles.editLink} onClick={() => (editing ? setEditing(false) : startEdit())}>
            {editing ? 'Cancel' : 'Edit details'}
          </button>
        </div>
      </div>

      {editing && editForm && (
        <form onSubmit={saveEdit} className={styles.fieldGrid} style={{ marginBottom: '0.75rem' }}>
          <Field label="Date">
            <input className={styles.input} type="date" required value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
          </Field>
          <Field label="Batch code">
            <input className={styles.input} required value={editForm.batchCode} onChange={(e) => setEditForm((f) => ({ ...f, batchCode: e.target.value }))} />
          </Field>
          <Field label="Start time">
            <input className={styles.input} required value={editForm.startTime} onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))} />
          </Field>
          <Field label="End time">
            <input className={styles.input} value={editForm.endTime} onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))} />
          </Field>
          <Field label="Room">
            <input className={styles.input} value={editForm.room} onChange={(e) => setEditForm((f) => ({ ...f, room: e.target.value }))} />
          </Field>
          <Field label="Doubt class">
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={editForm.isDoubt}
                onChange={(e) => setEditForm((f) => ({ ...f, isDoubt: e.target.checked }))}
              />
              Mark as a doubt class
            </label>
          </Field>
          <div className={styles.fieldWide} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Button type="submit" size="sm" disabled={editBusy}>
              {editBusy ? 'Saving…' : 'Save changes'}
            </Button>
            {editError && <p className={styles.feedbackErr}>{editError}</p>}
          </div>
        </form>
      )}

      {state === 'upcoming' ? (
        <div className={styles.fieldGrid}>
          <Field label="Topics to be taught">
            <input
              className={styles.input}
              value={plannedTopics}
              onChange={(e) => setPlannedTopics(e.target.value)}
              onBlur={() => save()}
              placeholder="e.g. Terminal velocity, Poiseuille's equation"
            />
          </Field>
          <Field label="Notes">
            <input className={styles.input} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => save()} placeholder="optional" />
          </Field>
        </div>
      ) : (
        <>
          {cls.plannedTopics && (
            <p className={styles.plannedRef}>
              <span className={styles.plannedRefLabel}>Planned:</span> {cls.plannedTopics}
            </p>
          )}
          <div className={styles.fieldGrid}>
            <Field label="Topics covered & taught">
              <input
                className={styles.input}
                value={topicsCovered}
                onChange={(e) => setTopicsCovered(e.target.value)}
                onBlur={() => save()}
                placeholder="what you actually got through"
              />
            </Field>
            <Field label="Notes">
              <input className={styles.input} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => save()} placeholder="optional" />
            </Field>
          </div>
        </>
      )}

      <div className={styles.formActions}>
        {state === 'toReview' && (
          <Button type="button" size="sm" onClick={() => save({ reviewed: true })}>
            Mark as taught
          </Button>
        )}
        {state === 'taught' && (
          <Button type="button" size="sm" variant="ghost" onClick={() => save({ reviewed: false })}>
            Reopen
          </Button>
        )}
        {cls.needsReview && (
          <Button type="button" size="sm" variant="ghost" onClick={() => save({ needsReview: false })}>
            Details look right
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
  const order = useMemo(() => batchOrder(classes.map((c) => c.batchCode)), [classes]);

  // Split classes by workflow state, then group each subset by day so a
  // day with (say) one reviewed + one still-to-review class shows in both
  // the "To review" and "Done" sections, not one arbitrary bucket.
  const sections = useMemo(() => {
    const buckets = { upcoming: [], toReview: [], done: [] };
    classes.forEach((c) => {
      const s = classState(c);
      buckets[s === 'taught' ? 'done' : s].push(c);
    });

    const blocksOf = (list, ascending) => {
      const byDate = new Map();
      list.forEach((c) => {
        const key = new Date(c.date).toISOString();
        if (!byDate.has(key)) byDate.set(key, { date: c.date, classes: [], upload: null });
        byDate.get(key).classes.push(c);
      });
      return byDate;
    };

    const upcomingMap = blocksOf(buckets.upcoming);
    const toReviewMap = blocksOf(buckets.toReview);
    const doneMap = blocksOf(buckets.done);

    // Attach uploads; an upload with no classes yet lands in the section
    // matching its date (future -> upcoming, past -> to review, since the
    // mentor still owes it that day's classes).
    uploads.forEach((u) => {
      const key = new Date(u.date).toISOString();
      const future = utcMidnight(u.date) > todayUtcMidnight();
      const map = upcomingMap.has(key)
        ? upcomingMap
        : toReviewMap.has(key)
          ? toReviewMap
          : doneMap.has(key)
            ? doneMap
            : future
              ? upcomingMap
              : toReviewMap;
      if (!map.has(key)) map.set(key, { date: u.date, classes: [], upload: u });
      else map.get(key).upload = u;
    });

    const sortAsc = (a, b) => new Date(a.date) - new Date(b.date);
    const sortDesc = (a, b) => new Date(b.date) - new Date(a.date);
    return {
      upcoming: [...upcomingMap.values()].sort(sortAsc),
      toReview: [...toReviewMap.values()].sort(sortDesc),
      done: [...doneMap.values()].sort(sortDesc),
    };
  }, [classes, uploads]);

  const counts = {
    upcoming: classes.filter((c) => classState(c) === 'upcoming').length,
    toReview: classes.filter((c) => classState(c) === 'toReview').length,
    done: classes.filter((c) => classState(c) === 'taught').length,
  };

  const weekStats = useMemo(() => {
    const start = todayUtcMidnight() - 3 * DAY_MS;
    const end = todayUtcMidnight() + 4 * DAY_MS;
    const inWindow = classes.filter((c) => {
      const t = utcMidnight(c.date);
      return t >= start && t < end;
    });
    return { count: inWindow.length, batches: new Set(inWindow.map((c) => c.batchCode)).size };
  }, [classes]);

  const renderPhaseBlocks = (title, tone, count, blocks) => {
    if (blocks.length === 0) return null;
    return (
      <div className={styles.phaseSection}>
        <div className={`${styles.phaseHead} ${styles[`phaseHead_${tone}`]}`}>
          <span className={styles.phaseHeadTitle}>{title}</span>
          <span className={styles.phaseHeadCount}>
            {count} class{count === 1 ? '' : 'es'}
          </span>
        </div>
        {blocks.map(({ date, classes: dayClasses, upload }) => {
          const rel = relativeDay(date);
          return (
            <section key={date} className={styles.day}>
              <div className={styles.dayHead}>
                <h3 className={styles.dayTitle}>
                  {rel && <span className={styles.dayRel}>{rel} · </span>}
                  {formatDate(date)}
                  {dayClasses.length === 0 && <span className={styles.dayEmpty}> — no classes added yet</span>}
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
                <ClassCard key={cls._id} cls={cls} order={order} onSaved={handleSaved} onDeleted={handleDeleted} />
              ))}
            </section>
          );
        })}
      </div>
    );
  };

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
          {!loading && !error && sections.upcoming.length === 0 && sections.toReview.length === 0 && sections.done.length === 0 && (
            <p className={styles.empty}>Nothing yet — upload a schedule above, or add a class by hand.</p>
          )}

          {!loading && !error && renderPhaseBlocks('Upcoming', 'upcoming', counts.upcoming, sections.upcoming)}
          {!loading && !error && renderPhaseBlocks('To review', 'review', counts.toReview, sections.toReview)}
          {!loading && !error && renderPhaseBlocks('Done', 'done', counts.done, sections.done)}
        </div>
      </DashboardLayout>
    </>
  );
}
