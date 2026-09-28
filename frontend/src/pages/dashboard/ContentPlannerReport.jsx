import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import AnalyticsChart from '../../components/dashboard/AnalyticsChart.jsx';
import { contentPlannerService } from '../../services/contentPlannerService.js';
import { STATUS_META, STATUS_ORDER, NEXT_STATUS, PLATFORM_META, TYPE_META } from '../../data/contentPlannerMeta.js';
import styles from './ContentPlannerReport.module.css';

const OVERVIEW_STATUSES = ['scripted', 'recorded', 'edited', 'uploaded'];

function pieceKey(conceptId, pieceId) {
  return `${conceptId}:${pieceId}`;
}

const QUICK_FILTERS = [
  { label: '🎥 Recorded, not edited', params: { status: 'recorded' } },
  { label: '✂️ Edited, not published', params: { status: 'edited' } },
  { label: '☁️ Uploaded, not scheduled/published', params: { status: 'uploaded' } },
  { label: '🖼️ Carousels planned', params: { status: 'planned', type: 'carousel' } },
  { label: '📅 Scheduled', params: { status: 'scheduled' } },
];

export default function ContentPlannerReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const platform = searchParams.get('platform') || '';
  const type = searchParams.get('type') || '';
  const search = searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState(search);
  const [mode, setMode] = useState('full'); // 'full' | 'simple'
  const [rows, setRows] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [data, statsData] = await Promise.all([
        contentPlannerService.listPieces({ status, platform, type, search }),
        contentPlannerService.stats(),
      ]);
      setRows(data);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [status, platform, type, search]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const applyQuickFilter = (params) => {
    const next = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => next.set(k, v));
    setSearchInput('');
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setParam('search', searchInput);
  };

  const handleAdvance = async (row) => {
    const next = NEXT_STATUS[row.status];
    if (!next) return;
    const key = pieceKey(row.conceptId, row._id);
    setBusyKey(key);
    try {
      await contentPlannerService.updatePieceStatus(row.conceptId, row._id, next);
      await load();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const handleSetStatus = async (row, newStatus) => {
    const key = pieceKey(row.conceptId, row._id);
    setBusyKey(key);
    try {
      await contentPlannerService.updatePieceStatus(row.conceptId, row._id, newStatus);
      await load();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const handleRemove = async (row) => {
    if (!window.confirm(`Remove piece "${row.pieceId}"? This can't be undone.`)) return;
    const key = pieceKey(row.conceptId, row._id);
    setBusyKey(key);
    try {
      await contentPlannerService.removePiece(row.conceptId, row._id);
      await load();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const breakdown = useMemo(() => {
    if (!rows) return null;
    const byPlatform = {};
    const byType = {};
    rows.forEach((r) => {
      byPlatform[r.platform] = (byPlatform[r.platform] || 0) + 1;
      byType[r.type] = (byType[r.type] || 0) + 1;
    });
    return { byPlatform, byType };
  }, [rows]);

  const activeFilterCount = [status, platform, type, search].filter(Boolean).length;

  const statusChartData = useMemo(
    () => (stats ? STATUS_ORDER.concat('on-hold').map((s) => ({ name: STATUS_META[s].label, count: stats.counts[s] ?? 0 })) : []),
    [stats]
  );
  const statusChartColors = useMemo(() => STATUS_ORDER.concat('on-hold').map((s) => STATUS_META[s].color), []);
  const platformChartData = useMemo(
    () =>
      stats
        ? Object.entries(PLATFORM_META)
            .map(([key, m]) => ({ name: m.label, value: stats.byPlatform?.[key] ?? 0, color: m.color }))
            .filter((d) => d.value > 0)
        : [],
    [stats]
  );
  const typeChartData = useMemo(
    () =>
      stats
        ? Object.entries(TYPE_META)
            .map(([key, m]) => ({ name: m.label, value: stats.byType?.[key] ?? 0, color: m.color }))
            .filter((d) => d.value > 0)
        : [],
    [stats]
  );

  return (
    <>
      <SEO title="Content Planner Report" description="Tabular drill-down into every content piece, by status, platform, and type." path="/dashboard/mentor/admin/content-planner/report" />
      <DashboardLayout role="mentor">
        <div className={styles.wrap}>
          <Link to="/dashboard/mentor/admin/content-planner" className={styles.backLink}>
            ← Back to Content Planner
          </Link>

          <div className={styles.header}>
            <h1 className={styles.title}>📊 Content Report</h1>
            <p className={styles.subtitle}>Every content piece, in one sortable table — filter it down to exactly what needs your attention next.</p>
          </div>

          {stats && (
            <>
              <div className={styles.overview}>
                <div className={styles.overviewTile}>
                  <span className={styles.overviewValue}>{stats.totalConcepts}</span>
                  <span className={styles.overviewLabel}>Concepts</span>
                </div>
                <div className={styles.overviewTile}>
                  <span className={styles.overviewValue}>{stats.totalPieces}</span>
                  <span className={styles.overviewLabel}>Content pieces</span>
                </div>
                {OVERVIEW_STATUSES.map((s) => (
                  <div key={s} className={styles.overviewTile} style={{ '--tile-color': STATUS_META[s].color }}>
                    <span className={styles.overviewValue} style={{ color: STATUS_META[s].color }}>
                      {stats.counts[s] ?? 0}
                    </span>
                    <span className={styles.overviewLabel}>{STATUS_META[s].actionHint || STATUS_META[s].label}</span>
                  </div>
                ))}
              </div>

              <div className={styles.chartsRow}>
                <div className={styles.chartCard}>
                  <AnalyticsChart
                    title="Pipeline by status"
                    type="bar"
                    data={statusChartData}
                    xKey="name"
                    yKey="count"
                    color="#94a3b8"
                    colors={statusChartColors}
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartCardTitle}>By platform</h3>
                  {platformChartData.length === 0 ? (
                    <ErrorState message="No data yet." />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={platformChartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={3}>
                          {platformChartData.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={24} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartCardTitle}>By content type</h3>
                  {typeChartData.length === 0 ? (
                    <ErrorState message="No data yet." />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={typeChartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={3}>
                          {typeChartData.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={24} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}

          <div className={styles.modeToggle}>
            <button type="button" className={mode === 'full' ? styles.modeBtnActive : styles.modeBtn} onClick={() => setMode('full')}>
              📋 Full table
            </button>
            <button type="button" className={mode === 'simple' ? styles.modeBtnActive : styles.modeBtn} onClick={() => setMode('simple')}>
              🧾 Simple table
            </button>
            {mode === 'simple' && (
              <span className={styles.modeHint}>Just chapter, topic, concept name &amp; status — pick a type below to see one content type at a time.</span>
            )}
          </div>

          <div className={styles.quickFilters}>
            {QUICK_FILTERS.map((qf) => (
              <button key={qf.label} type="button" className={styles.quickFilterChip} onClick={() => applyQuickFilter(qf.params)}>
                {qf.label}
              </button>
            ))}
          </div>

          <form className={styles.filterBar} onSubmit={handleSearchSubmit}>
            <input
              className={styles.searchInput}
              placeholder="Search concept, chapter, topic, piece id…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <select value={status} onChange={(e) => setParam('status', e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_META).map(([key, m]) => (
                <option key={key} value={key}>
                  {m.icon} {m.label}
                </option>
              ))}
            </select>
            <select value={platform} onChange={(e) => setParam('platform', e.target.value)}>
              <option value="">All platforms</option>
              {Object.entries(PLATFORM_META).map(([key, m]) => (
                <option key={key} value={key}>
                  {m.icon} {m.label}
                </option>
              ))}
            </select>
            <select value={type} onChange={(e) => setParam('type', e.target.value)}>
              <option value="">All types</option>
              {Object.entries(TYPE_META).map(([key, m]) => (
                <option key={key} value={key}>
                  {m.icon} {m.label}
                </option>
              ))}
            </select>
            <button type="submit" className={styles.searchBtn}>
              Search
            </button>
            {activeFilterCount > 0 && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => {
                  setSearchInput('');
                  setSearchParams(new URLSearchParams());
                }}
              >
                Clear filters
              </button>
            )}
          </form>

          {loading && <Spinner label="Loading report…" />}
          {error && <ErrorState message={error} onRetry={load} />}

          {rows && (
            <>
              <div className={styles.summaryBar}>
                <span className={styles.summaryCount}>
                  {rows.length} piece{rows.length === 1 ? '' : 's'}
                </span>
                {breakdown &&
                  Object.entries(breakdown.byPlatform).map(([p, c]) => (
                    <span key={p} className={styles.summaryChip}>
                      {PLATFORM_META[p]?.icon} {PLATFORM_META[p]?.label}: {c}
                    </span>
                  ))}
                {breakdown &&
                  Object.entries(breakdown.byType).map(([t, c]) => (
                    <span key={t} className={styles.summaryChip}>
                      {TYPE_META[t]?.icon} {TYPE_META[t]?.label}: {c}
                    </span>
                  ))}
              </div>

              {rows.length === 0 ? (
                <div className={styles.emptyState}>No pieces match these filters.</div>
              ) : mode === 'simple' ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Chapter</th>
                        <th>Topic</th>
                        <th>Concept name</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const meta = STATUS_META[row.status];
                        return (
                          <tr key={row._id} style={{ '--row-color': meta.color }} className={styles.statusRow}>
                            <td>{row.chapter || '—'}</td>
                            <td>{row.topic || '—'}</td>
                            <td>{row.conceptTitle}</td>
                            <td>
                              <span className={styles.statusPill} style={{ background: meta.pillBg, color: meta.pillText }}>
                                {meta.icon} {meta.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Piece ID</th>
                        <th>Concept</th>
                        <th>Platform</th>
                        <th>Type</th>
                        <th>Label</th>
                        <th>Status</th>
                        <th>PYQ / Source</th>
                        <th>Scheduled</th>
                        <th>Updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const meta = STATUS_META[row.status];
                        const next = NEXT_STATUS[row.status];
                        const key = pieceKey(row.conceptId, row._id);
                        return (
                          <tr key={row._id} style={{ '--row-color': meta.color }} className={styles.statusRow}>
                            <td>
                              <code className={styles.idCell}>{row.pieceId}</code>
                            </td>
                            <td>
                              <div className={styles.conceptCell}>
                                <strong>{row.conceptTitle}</strong>
                                {(row.chapter || row.topic) && (
                                  <span className={styles.conceptSub}>
                                    {row.chapter}
                                    {row.chapter && row.topic ? ' · ' : ''}
                                    {row.topic}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span
                                className={styles.platformBadge}
                                style={{ '--platform-color': PLATFORM_META[row.platform]?.color }}
                              >
                                {PLATFORM_META[row.platform]?.icon} {PLATFORM_META[row.platform]?.label}
                              </span>
                            </td>
                            <td>
                              {TYPE_META[row.type]?.icon} {TYPE_META[row.type]?.label}
                            </td>
                            <td>{row.label || '—'}</td>
                            <td>
                              <span className={styles.statusPill} style={{ background: meta.pillBg, color: meta.pillText }}>
                                {meta.icon} {meta.label}
                              </span>
                            </td>
                            <td>
                              {row.isPYQ ? (
                                <span className={styles.pyqChip}>
                                  🏆 {row.source || 'PYQ'} {row.pyqYear || ''}
                                </span>
                              ) : (
                                row.source || '—'
                              )}
                            </td>
                            <td>{row.scheduledFor ? new Date(row.scheduledFor).toLocaleDateString() : '—'}</td>
                            <td className={styles.updatedCell}>{new Date(row.updatedAt).toLocaleDateString()}</td>
                            <td>
                              <div className={styles.rowActions}>
                                {next && (
                                  <button
                                    type="button"
                                    className={styles.advanceBtn}
                                    disabled={busyKey === key}
                                    onClick={() => handleAdvance(row)}
                                    title={`Advance to ${STATUS_META[next].label}`}
                                  >
                                    {STATUS_META[next].label} →
                                  </button>
                                )}
                                <select
                                  className={styles.statusSelect}
                                  value={row.status}
                                  disabled={busyKey === key}
                                  onChange={(e) => handleSetStatus(row, e.target.value)}
                                >
                                  {Object.entries(STATUS_META).map(([k, m]) => (
                                    <option key={k} value={k}>
                                      {m.icon} {m.label}
                                    </option>
                                  ))}
                                </select>
                                {row.link && (
                                  <a href={row.link} target="_blank" rel="noreferrer" className={styles.openLink} title="Open link">
                                    🔗
                                  </a>
                                )}
                                <button
                                  type="button"
                                  className={styles.removeBtn}
                                  disabled={busyKey === key}
                                  onClick={() => handleRemove(row)}
                                  title="Remove piece"
                                >
                                  ×
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
