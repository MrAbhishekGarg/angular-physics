import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import BatchChip from '../../components/dashboard/BatchChip.jsx';
import { batchColor, batchOrder } from '../../data/batchColors.js';
import { formatTimeRange } from '../../data/classTime.js';
import { jobScheduleService } from '../../services/jobScheduleService.js';
import styles from './JobDashboard.module.css';

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

function Tile({ value, label, sub, tone }) {
  return (
    <div className={`${styles.tile} ${tone ? styles[tone] : ''}`}>
      <span className={`${styles.tileValue} ${tone ? styles[`v_${tone}`] : ''}`}>{value}</span>
      <span className={styles.tileLabel}>{label}</span>
      {sub != null && <span className={styles.tileSub}>{sub}</span>}
    </div>
  );
}

function HoursByBatch({ batches, order }) {
  const rows = [...batches].filter((b) => b.hours > 0).sort((a, b) => b.hours - a.hours).slice(0, 8);
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((b) => b.hours));
  return (
    <div className={styles.card}>
      <h2>Hours by batch</h2>
      <div className={styles.hbb}>
        {rows.map((b) => (
          <div key={b.batchCode} className={styles.hbbRow}>
            <span className={styles.hbbLabel}>{b.batchCode}</span>
            <div className={styles.hbbTrack}>
              <div className={styles.hbbFill} style={{ width: `${(b.hours / max) * 100}%`, background: batchColor(b.batchCode, order) }} />
            </div>
            <span className={styles.hbbVal}>{b.hours} h</span>
          </div>
        ))}
      </div>
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
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = async () => {
    setLoading(true);
    setError('');
    try {
      const [d, b] = await Promise.all([jobScheduleService.getDashboard(), jobScheduleService.getBatches()]);
      setData(d);
      setBatches(b);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  const order = useMemo(() => batchOrder(batches.map((b) => b.batchCode)), [batches]);

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
                  value={data.counts.toReview}
                  label="To review"
                  sub={data.counts.toReview ? 'confirm what was taught' : 'all reviewed'}
                  tone={data.counts.toReview ? 'warn' : undefined}
                />
                <Tile value={`${data.hours.avgClassMinutes}m`} label="Avg class length" sub={data.busiestDay ? `busiest: ${data.busiestDay}` : undefined} />
              </div>

              <div className={styles.card}>
                <h2>Classes per week — last 8 weeks</h2>
                <WeekBars data={data.byWeek} />
              </div>

              <HoursByBatch batches={batches} order={order} />

              <div className={styles.cols}>
                <div className={styles.card}>
                  <h2>By batch</h2>
                  <div className={styles.tableScroll}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Batch</th>
                          <th>Done</th>
                          <th>Upcoming</th>
                          <th>Hours</th>
                          <th>Plan</th>
                          <th>Last / next</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.length === 0 ? (
                          <tr>
                            <td colSpan={6} className={styles.tileSub}>
                              No batches yet.
                            </td>
                          </tr>
                        ) : (
                          batches.map((b) => (
                            <tr key={b.batchCode}>
                              <td>
                                <span className={styles.batchCell}>
                                  <span className={styles.batchDot} style={{ background: batchColor(b.batchCode, order) }} />
                                  <strong>{b.batchCode}</strong>
                                </span>
                              </td>
                              <td>{b.doneCount ?? b.classCount}</td>
                              <td>{b.upcomingCount ?? 0}</td>
                              <td>{b.hours}</td>
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
                              <td className={styles.tileSub}>
                                {b.lastTaught ? fmtDate(b.lastTaught) : '—'}
                                {b.nextClass ? ` → ${fmtDate(b.nextClass)}` : ''}
                              </td>
                            </tr>
                          ))
                        )}
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
                          <li key={c._id} className={styles.listItem} style={{ borderLeftColor: batchColor(c.batchCode, order) }}>
                            <div className={styles.listTop}>
                              <strong>{fmtDate(c.date)}</strong>
                              <BatchChip code={c.batchCode} order={order} size="sm" />
                            </div>
                            <span className={styles.muted}>
                              {formatTimeRange(c.startTime, c.endTime)} · Room {c.room || '?'}
                            </span>
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
                          <li key={t._id} className={styles.listItem} style={{ borderLeftColor: batchColor(t.batchCode, order) }}>
                            <div className={styles.listTop}>
                              <BatchChip code={t.batchCode} order={order} size="sm" />
                              <span className={styles.muted}>{fmtDate(t.date)}</span>
                            </div>
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
