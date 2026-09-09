import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { jobScheduleService } from '../../services/jobScheduleService.js';
import formStyles from './DashboardForm.module.css';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function groupByDate(classes) {
  const groups = new Map();
  classes.forEach((c) => {
    const key = c.date;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  });
  return [...groups.entries()].sort((a, b) => new Date(b[0]) - new Date(a[0]));
}

function ClassRow({ cls, onSaved, onDeleted }) {
  const [topicsCovered, setTopicsCovered] = useState(cls.topicsCovered || '');
  const [notes, setNotes] = useState(cls.notes || '');
  const [busy, setBusy] = useState(false);

  const save = async (extra = {}) => {
    setBusy(true);
    try {
      const updated = await jobScheduleService.updateClass(cls._id, { topicsCovered, notes, ...extra });
      onSaved(updated);
    } finally {
      setBusy(false);
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
        </strong>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
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
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => save({ needsReview: false })}>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [file, setFile] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadWarnings, setUploadWarnings] = useState([]);
  const [uploadFailed, setUploadFailed] = useState(false);

  const refetch = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await jobScheduleService.listClasses();
      setClasses(data);
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
    setUploadBusy(true);
    setUploadMessage('');
    setUploadWarnings([]);
    setUploadFailed(false);
    try {
      const { classes: created, warnings } = await jobScheduleService.uploadPdf(file);
      setUploadMessage(`Extracted ${created.length} class${created.length === 1 ? '' : 'es'}.`);
      setUploadWarnings(warnings);
      setFile(null);
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

  const needsReviewCount = classes.filter((c) => c.needsReview).length;
  const groups = groupByDate(classes);

  return (
    <>
      <SEO title="My Job — Schedule" description="Personal Aakash class schedule tracking." path="/dashboard/mentor/admin/job-schedule" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <h1>My Job — Schedule</h1>
          <p style={{ color: 'var(--ap-text-muted)' }}>
            Your Aakash classes, extracted from the daily schedule PDF. Not part of the Angular Physics business —{' '}
            <Link to="/dashboard/mentor/admin/job-schedule/batches">see batch progress</Link>.
          </p>

          <div className={formStyles.card}>
            <strong>Upload today's schedule PDF</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)', margin: '0.3rem 0' }}>
              Extracts every class matching your faculty code from the PDF's own grid — a best-effort read of a dense,
              multi-table layout, so double-check anything flagged "Needs review" below. Set up the Zapier bridge
              to skip this manual step entirely.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} style={{ flex: 1, minWidth: 200 }} />
              <Button type="button" size="sm" disabled={!file || uploadBusy} onClick={handleUpload}>
                {uploadBusy ? 'Extracting…' : 'Upload & Extract'}
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

          {needsReviewCount > 0 && (
            <p style={{ color: 'var(--ap-warning)', fontWeight: 600, fontSize: '0.9rem' }}>
              {needsReviewCount} class{needsReviewCount === 1 ? '' : 'es'} need review.
            </p>
          )}

          {loading && <Spinner />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading &&
            !error &&
            groups.map(([date, dayClasses]) => {
              const uploadId = dayClasses.find((c) => c.source === 'pdf')?.sourceUploadId;
              return (
                <div key={date} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <h3 style={{ marginBottom: '0.4rem' }}>{formatDate(date)}</h3>
                    {uploadId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!window.confirm("Delete this whole day's upload and every class extracted from it?")) return;
                          await jobScheduleService.removeUpload(uploadId);
                          await refetch();
                        }}
                      >
                        Delete this upload
                      </Button>
                    )}
                  </div>
                  {dayClasses.map((cls) => (
                    <ClassRow key={cls._id} cls={cls} onSaved={handleSaved} onDeleted={handleDeleted} />
                  ))}
                </div>
              );
            })}
          {!loading && !error && classes.length === 0 && <p style={{ color: 'var(--ap-text-muted)' }}>No classes yet — upload a schedule PDF above.</p>}
        </div>
      </DashboardLayout>
    </>
  );
}
