import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { jobScheduleService } from '../../services/jobScheduleService.js';
import styles from './JobDashboard.module.css';

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

function Tile({ value, label, sub, tone }) {
  return (
    <div className={`${styles.tile} ${tone ? styles[tone] : ''}`}>
      <span className={styles.tileValue}>{value}</span>
      <span className={styles.tileLabel}>{label}</span>
      {sub != null && <span className={styles.tileSub}>{sub}</span>}
    </div>
  );
}

function WeekBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.classes));
  return (
    <div className={styles.chart}>
      {data.map((d) => (
        <div key={d.weekStart} className={styles.barCol} title={`Week of ${fmtDate(d.weekStart)} — ${d.classes} classes, ${d.hours} h`}>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ height: `${(d.classes / max) * 100}%` }}>
              {d.classes > 0 && <span className={styles.barValue}>{d.classes}</span>}
            </div>
          </div>
          <span className={styles.barLabel}>{fmtDate(d.weekStart)}</span>
        </div>
      ))}
    </div>
  );
}

export default function JobDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await jobScheduleService.getDashboard());
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
      <SEO title="My Job — Overview" description="Personal Aakash teaching dashboard." path="/dashboard/mentor/admin/job" />
      <DashboardLayout role="mentor">
        <div className={styles.wrap}>
          <h1>My Job — Overview</h1>
          <p className={styles.lede}>
            Your Aakash teaching at a glance. Manage days on the{' '}
            <Link to="/dashboard/mentor/admin/job-schedule">schedule</Link>, plan topics under{' '}
            <Link to="/dashboard/mentor/admin/job-schedule/batches">batch progress</Link>.
          </p>

          {loading && <Spinner />}
          {error && <ErrorState message={error} onRetry={refetch} />}

          {!loading && !error && data && (
            <>
              <div className={styles.tiles}>
                <Tile value={data.counts.done} label="Classes done" sub={`${data.hours.done} h taught`} tone="ok" />
                <Tile value={data.counts.upcoming} label="Upcoming classes" sub={`${data.hours.upcoming} h scheduled`} tone="accent" />
                <Tile value={`${data.hours.total} h`} label="Total class hours" sub={`${data.counts.total} classes`} />
                <Tile
                  value={data.counts.thisWeek}
                  label="This week"
                  sub={`${data.hours.thisWeek} h`}
                  tone="accent"
                />
                <Tile value={data.counts.batches} label="Batches taught" sub={data.topBatch ? `most: ${data.topBatch.batchCode}` : undefined} />
                <Tile
                  value={`${data.topics.covered}/${data.topics.planned}`}
                  label="Topics covered"
                  sub={data.topics.planned ? `${data.topics.remaining} to go` : 'no plan yet'}
                  tone="ok"
                />
                <Tile
                  value={data.counts.needsReview}
                  label="Need review"
                  sub={data.counts.needsReview ? 'check the schedule' : 'all clear'}
                  tone={data.counts.needsReview ? 'warn' : undefined}
                />
                <Tile value={`${data.hours.avgClassMinutes}m`} label="Avg class length" sub={data.busiestDay ? `busiest: ${data.busiestDay}` : undefined} />
              </div>

              <div className={styles.card}>
                <h2>Classes per week — last 8 weeks</h2>
                <WeekBars data={data.byWeek} />
              </div>

              <div className={styles.cols}>
                <div className={styles.card}>
                  <h2>By batch</h2>
                  <div className={styles.tableScroll}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Batch</th>
                          <th>Classes</th>
                          <th>Hours</th>
                          <th>Topics logged</th>
                          <th>Plan</th>
                          <th>Last taught</th>
                        </tr>
                      </thead>
                      <tbody>
                        <BatchRows />
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div className={styles.card}>
                    <h2>Next up</h2>
                    {data.upcomingClasses.length === 0 ? (
                      <p className={styles.tileSub}>Nothing scheduled ahead.</p>
                    ) : (
                      <ul className={styles.list}>
                        {data.upcomingClasses.map((c) => (
                          <li key={c._id} className={styles.listItem}>
                            <strong>{fmtDate(c.date)}</strong> · {c.startTime}
                            {c.endTime ? `–${c.endTime}` : ''} · {c.batchCode}
                            <span className={styles.muted}> · Room {c.room || '?'}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className={styles.card}>
                    <h2>Recent topics taught</h2>
                    {data.recentTopics.length === 0 ? (
                      <p className={styles.tileSub}>No topics logged yet — add them on the schedule as you teach.</p>
                    ) : (
                      <ul className={styles.list}>
                        {data.recentTopics.map((t) => (
                          <li key={t._id} className={styles.listItem}>
                            <strong>{t.batchCode}</strong> <span className={styles.muted}>· {fmtDate(t.date)}</span>
                            <div>{t.topicsCovered}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.factRow}>
                  <span>
                    Topics: <strong>{data.topics.covered}</strong> covered · <strong>{data.topics.remaining}</strong> planned & pending ·{' '}
                    <strong>{data.topics.logged}</strong> class notes logged
                  </span>
                  {data.busiestDay && (
                    <span>
                      Busiest day: <strong>{data.busiestDay}</strong>
                    </span>
                  )}
                  {data.topBatch && (
                    <span>
                      Most-taught batch: <strong>{data.topBatch.batchCode}</strong> ({data.topBatch.classes})
                    </span>
                  )}
                  <span>
                    Schedule files uploaded: <strong>{data.counts.uploads}</strong>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}

// Separate fetch so the batch table can pull the richer per-batch summary
// (hours, plan progress) without bloating the dashboard aggregate.
function BatchRows() {
  const [batches, setBatches] = useState(null);
  useEffect(() => {
    jobScheduleService.getBatches().then(setBatches).catch(() => setBatches([]));
  }, []);

  if (!batches) {
    return (
      <tr>
        <td colSpan={6} className={styles.tileSub}>
          Loading…
        </td>
      </tr>
    );
  }
  if (batches.length === 0) {
    return (
      <tr>
        <td colSpan={6} className={styles.tileSub}>
          No batches yet.
        </td>
      </tr>
    );
  }
  return batches.map((b) => (
    <tr key={b.batchCode}>
      <td>
        <strong>{b.batchCode}</strong>
      </td>
      <td>{b.classCount}</td>
      <td>{b.hours}</td>
      <td>{b.topicsLogged}</td>
      <td style={{ minWidth: 90 }}>
        {b.planned > 0 ? (
          <>
            <div className={styles.progress}>
              <div className={styles.progressFill} style={{ width: `${(b.planCovered / b.planned) * 100}%` }} />
            </div>
            <span className={styles.tileSub}>
              {b.planCovered}/{b.planned}
            </span>
          </>
        ) : (
          <span className={styles.tileSub}>—</span>
        )}
      </td>
      <td>{b.lastTaught ? fmtDate(b.lastTaught) : '—'}</td>
    </tr>
  ));
}
