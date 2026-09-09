import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { jobScheduleService } from '../../services/jobScheduleService.js';
import formStyles from './DashboardForm.module.css';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export default function JobScheduleBatches() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = async () => {
    setLoading(true);
    setError('');
    try {
      setBatches(await jobScheduleService.getBatches());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return (
    <>
      <SEO title="My Job — Batch Progress" description="Per-batch teaching log for Aakash classes." path="/dashboard/mentor/admin/job-schedule/batches" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <h1>My Job — Batch Progress</h1>
          <p style={{ color: 'var(--ap-text-muted)' }}>
            Every batch you've taught, with a running log of what was covered — back to{' '}
            <Link to="/dashboard/mentor/admin/job-schedule">the schedule</Link>.
          </p>

          {loading && <Spinner />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && batches.length === 0 && (
            <p style={{ color: 'var(--ap-text-muted)' }}>No classes logged yet.</p>
          )}
          {!loading &&
            !error &&
            batches.map((batch) => (
              <div key={batch.batchCode} className={formStyles.card} style={{ marginBottom: '0.6rem' }}>
                <div className={formStyles.cardHeader}>
                  <strong>{batch.batchCode}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>
                    {batch.classCount} class{batch.classCount === 1 ? '' : 'es'} · last taught {formatDate(batch.lastTaught)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {batch.classes.map((c) => (
                    <div
                      key={c._id}
                      style={{
                        borderLeft: '3px solid var(--ap-border)',
                        paddingLeft: '0.6rem',
                        fontSize: '0.85rem',
                      }}
                    >
                      <strong>{formatDate(c.date)}</strong> · {c.startTime}
                      {c.endTime ? `–${c.endTime}` : ''} · Room {c.room || '?'}
                      {c.topicsCovered && <div style={{ color: 'var(--ap-text-muted)' }}>{c.topicsCovered}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </DashboardLayout>
    </>
  );
}
