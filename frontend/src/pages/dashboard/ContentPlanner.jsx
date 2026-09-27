import { useEffect, useMemo, useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { contentPlannerService } from '../../services/contentPlannerService.js';
import { questionService } from '../../services/questionService.js';
import { CURRICULUM_CHAPTERS, CURRICULUM_TOPICS } from '../../data/physicsCurriculum.js';
import { api } from '../../services/api.js';
import styles from './ContentPlanner.module.css';

const STATUS_META = {
  planned: { label: 'Planned', icon: '💡', tone: 'planned' },
  scripted: { label: 'Scripted', icon: '📝', tone: 'scripted' },
  recorded: { label: 'Recorded', icon: '🎥', tone: 'recorded' },
  edited: { label: 'Edited', icon: '✂️', tone: 'edited' },
  uploaded: { label: 'Uploaded', icon: '☁️', tone: 'uploaded' },
  published: { label: 'Published', icon: '✅', tone: 'published' },
  'on-hold': { label: 'On Hold', icon: '⏸️', tone: 'onhold' },
};
const STATUS_ORDER = ['planned', 'scripted', 'recorded', 'edited', 'uploaded', 'published'];
const NEXT_STATUS = { planned: 'scripted', scripted: 'recorded', recorded: 'edited', edited: 'uploaded', uploaded: 'published' };

const PLATFORM_META = {
  youtube: { label: 'YouTube', icon: '▶️' },
  instagram: { label: 'Instagram', icon: '📸' },
};
const TYPE_META = {
  'long-video': { label: 'Long Video', icon: '🎬' },
  short: { label: 'Short', icon: '⚡' },
  carousel: { label: 'Carousel', icon: '🖼️' },
  'community-post': { label: 'Community Post', icon: '💬' },
};

const EMPTY_FORM = {
  title: '',
  chapter: '',
  topic: '',
  notes: '',
  longVideoCount: 1,
  includeShort: true,
  shortPlatforms: 'both',
  includeCarousel: false,
  includeCommunityPost: false,
  isPYQ: false,
  source: '',
  pyqYear: '',
};

const EMPTY_ADD_PIECE = { platform: 'youtube', type: 'long-video', label: '', source: '', isPYQ: false, pyqYear: '' };

function pieceKey(conceptId, pieceId) {
  return `${conceptId}:${pieceId}`;
}

function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

export default function ContentPlanner() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [questionTaxonomy, setQuestionTaxonomy] = useState(null);
  const [usedTopics, setUsedTopics] = useState(null);
  const [concepts, setConcepts] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdConcept, setCreatedConcept] = useState(null);
  const [busyKey, setBusyKey] = useState('');
  const [filters, setFilters] = useState({ status: '', platform: '', type: '', search: '' });
  const [addPieceFor, setAddPieceFor] = useState('');
  const [addPieceForm, setAddPieceForm] = useState(EMPTY_ADD_PIECE);
  const [sheetsStatus, setSheetsStatus] = useState(null);
  const [resyncing, setResyncing] = useState(false);
  const [resyncMessage, setResyncMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [conceptsData, statsData] = await Promise.all([contentPlannerService.list(filters), contentPlannerService.stats()]);
      setConcepts(conceptsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUsedTopics = () => contentPlannerService.topics().then(setUsedTopics).catch(() => {});

  useEffect(() => {
    questionService.getTaxonomy().then(setQuestionTaxonomy).catch(() => {});
    contentPlannerService.sheetsStatus().then(setSheetsStatus).catch(() => {});
    loadUsedTopics();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [filters.status, filters.platform, filters.type]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load();
  };

  const handleFormChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const concept = await contentPlannerService.create({
        title: form.title,
        chapter: form.chapter,
        topic: form.topic,
        notes: form.notes,
        source: form.source,
        isPYQ: form.isPYQ,
        pyqYear: form.isPYQ && form.pyqYear ? Number(form.pyqYear) : undefined,
        bundle: {
          longVideoCount: Number(form.longVideoCount),
          includeShort: form.includeShort,
          shortPlatforms: form.shortPlatforms,
          includeCarousel: form.includeCarousel,
          includeCommunityPost: form.includeCommunityPost,
        },
      });
      setCreatedConcept(concept);
      setForm((f) => ({ ...EMPTY_FORM, chapter: f.chapter }));
      await Promise.all([load(), loadUsedTopics()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConcept = async (concept) => {
    if (!window.confirm(`Delete concept "${concept.title}" and all ${concept.pieces.length} of its content pieces? This can't be undone.`)) return;
    setBusyKey(concept.conceptId);
    try {
      await contentPlannerService.remove(concept.conceptId);
      await load();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const handleAdvancePiece = async (concept, piece) => {
    const next = NEXT_STATUS[piece.status];
    if (!next) return;
    const key = pieceKey(concept.conceptId, piece._id);
    setBusyKey(key);
    try {
      await contentPlannerService.updatePieceStatus(concept.conceptId, piece._id, next);
      await load();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const handleSetPieceStatus = async (concept, piece, status) => {
    const key = pieceKey(concept.conceptId, piece._id);
    setBusyKey(key);
    try {
      await contentPlannerService.updatePieceStatus(concept.conceptId, piece._id, status);
      await load();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const handleRemovePiece = async (concept, piece) => {
    const key = pieceKey(concept.conceptId, piece._id);
    setBusyKey(key);
    try {
      await contentPlannerService.removePiece(concept.conceptId, piece._id);
      await load();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const openAddPiece = (conceptId) => {
    setAddPieceFor(conceptId);
    setAddPieceForm(EMPTY_ADD_PIECE);
  };

  const handleAddPiece = async (concept) => {
    setBusyKey(`add-${concept.conceptId}`);
    try {
      await contentPlannerService.addPiece(concept.conceptId, {
        ...addPieceForm,
        pyqYear: addPieceForm.isPYQ && addPieceForm.pyqYear ? Number(addPieceForm.pyqYear) : undefined,
      });
      setAddPieceFor('');
      await load();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const handleResyncAll = async () => {
    setResyncing(true);
    setResyncMessage('');
    try {
      const result = await contentPlannerService.resyncAll();
      setResyncMessage(`Synced ${result.synced} piece${result.synced === 1 ? '' : 's'} to the sheet.`);
    } catch (err) {
      setResyncMessage(err.message);
    } finally {
      setResyncing(false);
    }
  };

  const chapterOptions = useMemo(
    () => [...new Set([...CURRICULUM_CHAPTERS, ...(questionTaxonomy?.chapters || []), ...(usedTopics?.chapters || [])])].sort(),
    [questionTaxonomy, usedTopics]
  );
  const topicOptions = useMemo(
    () => [...new Set([...CURRICULUM_TOPICS, ...(questionTaxonomy?.topics || []), ...(usedTopics?.topics || [])])].sort(),
    [questionTaxonomy, usedTopics]
  );

  const exportUrl = `${api.defaults.baseURL}/content-planner/export`;

  return (
    <>
      <SEO title="Content Planner" description="Plan and track YouTube and Instagram content by concept." path="/dashboard/mentor/admin/content-planner" />
      <DashboardLayout role="mentor">
        <div className={styles.wrap}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>🗂️ Content Planner</h1>
              <p className={styles.subtitle}>
                Plan a concept once, spin up every piece of content it needs — long videos, a short, a carousel, a community
                post — and track each through its own pipeline across YouTube and Instagram. Every piece gets its own id.
              </p>
            </div>
            <div className={styles.headerControls}>
              <div className={styles.controlsRow}>
                {sheetsStatus?.configured && (
                  <>
                    <a href={sheetsStatus.sheetUrl} target="_blank" rel="noreferrer" className={styles.sheetsBadge}>
                      <span className={styles.sheetsBadgeDot} />
                      Synced to Google Sheets
                      <span className={styles.sheetsBadgeArrow}>↗</span>
                    </a>
                    <button type="button" className={styles.resyncBtn} disabled={resyncing} onClick={handleResyncAll}>
                      {resyncing ? 'Syncing…' : '🔄 Resync all'}
                    </button>
                  </>
                )}
                {sheetsStatus && !sheetsStatus.configured && (
                  <span className={`${styles.sheetsBadge} ${styles.sheetsBadgeOff}`}>
                    <span className={styles.sheetsBadgeDot} />
                    Google Sheets not connected
                  </span>
                )}
                <a href={exportUrl} className={styles.exportBtn}>
                  ⬇ Download Excel
                </a>
              </div>
              {resyncMessage && <span className={styles.resyncMessage}>{resyncMessage}</span>}
            </div>
          </div>

          {stats && (
            <div className={styles.statsRow}>
              {STATUS_ORDER.concat('on-hold').map((s) => (
                <button
                  type="button"
                  key={s}
                  className={`${styles.statCard} ${styles[`statCard_${STATUS_META[s].tone}`]} ${filters.status === s ? styles.statCardActive : ''}`}
                  onClick={() => setFilters((f) => ({ ...f, status: f.status === s ? '' : s }))}
                >
                  <span className={styles.statIcon}>{STATUS_META[s].icon}</span>
                  <span className={styles.statValue}>{stats.counts[s] ?? 0}</span>
                  <span className={styles.statLabel}>{STATUS_META[s].label}</span>
                </button>
              ))}
              <div className={styles.statTotal}>
                <span className={styles.statTotalValue}>{stats.totalConcepts}</span>
                <span className={styles.statTotalLabel}>Concepts</span>
                <span className={styles.statTotalValue}>{stats.totalPieces}</span>
                <span className={styles.statTotalLabel}>Content Pieces</span>
              </div>
            </div>
          )}

          <div className={styles.layout}>
            <div className={styles.formCol}>
              <div className={styles.formCard}>
                <h2 className={styles.formCardTitle}>+ New Concept</h2>
                <form onSubmit={handleCreate} className={styles.form}>
                  <label>
                    Concept title
                    <input
                      name="title"
                      required
                      value={form.title}
                      onChange={handleFormChange}
                      placeholder="e.g. Metacenter & Equilibrium of Floating Bodies"
                    />
                  </label>

                  <div className={styles.row}>
                    <label>
                      Chapter
                      <input name="chapter" value={form.chapter} onChange={handleFormChange} placeholder="e.g. Mechanical Properties of Fluids" list="cp-chapter-suggestions" />
                      <datalist id="cp-chapter-suggestions">
                        {chapterOptions.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </label>
                    <label>
                      Topic
                      <input name="topic" value={form.topic} onChange={handleFormChange} placeholder="e.g. Metacenter" list="cp-topic-suggestions" />
                      <datalist id="cp-topic-suggestions">
                        {topicOptions.map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </label>
                  </div>

                  <div className={styles.bundleBox}>
                    <span className={styles.bundleLabel}>Create these pieces now</span>

                    <div className={styles.bundleRow}>
                      <span className={styles.bundleItemLabel}>🎬 Long video(s)</span>
                      <div className={styles.segmentGroup}>
                        {[1, 2].map((n) => (
                          <button
                            type="button"
                            key={n}
                            className={`${styles.segmentBtn} ${Number(form.longVideoCount) === n ? styles.segmentBtnActive : ''}`}
                            onClick={() => setForm((f) => ({ ...f, longVideoCount: n }))}
                          >
                            {n}
                          </button>
                        ))}
                        <button
                          type="button"
                          className={`${styles.segmentBtn} ${Number(form.longVideoCount) === 0 ? styles.segmentBtnActive : ''}`}
                          onClick={() => setForm((f) => ({ ...f, longVideoCount: 0 }))}
                        >
                          None
                        </button>
                      </div>
                    </div>

                    <label className={styles.toggleRow}>
                      <input type="checkbox" name="includeShort" checked={form.includeShort} onChange={handleFormChange} />
                      <span className={styles.toggleTrack}>
                        <span className={styles.toggleThumb} />
                      </span>
                      <span className={styles.toggleText}>⚡ Short</span>
                      {form.includeShort && (
                        <select
                          name="shortPlatforms"
                          value={form.shortPlatforms}
                          onChange={handleFormChange}
                          className={styles.inlineSelect}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="both">Both platforms</option>
                          <option value="youtube">YouTube only</option>
                          <option value="instagram">Instagram only</option>
                        </select>
                      )}
                    </label>

                    <label className={styles.toggleRow}>
                      <input type="checkbox" name="includeCarousel" checked={form.includeCarousel} onChange={handleFormChange} />
                      <span className={styles.toggleTrack}>
                        <span className={styles.toggleThumb} />
                      </span>
                      <span className={styles.toggleText}>🖼️ Carousel (Instagram)</span>
                    </label>

                    <label className={styles.toggleRow}>
                      <input type="checkbox" name="includeCommunityPost" checked={form.includeCommunityPost} onChange={handleFormChange} />
                      <span className={styles.toggleTrack}>
                        <span className={styles.toggleThumb} />
                      </span>
                      <span className={styles.toggleText}>💬 Community Post (YouTube)</span>
                    </label>
                  </div>

                  <div className={styles.pyqBox}>
                    <label className={styles.toggleRow}>
                      <input type="checkbox" name="isPYQ" checked={form.isPYQ} onChange={handleFormChange} />
                      <span className={styles.toggleTrack}>
                        <span className={styles.toggleThumb} />
                      </span>
                      <span className={styles.toggleText}>🏆 Based on a PYQ (applies to every piece above)</span>
                    </label>
                    <div className={styles.row}>
                      <label>
                        Source
                        <input name="source" value={form.source} onChange={handleFormChange} placeholder="e.g. JEE Mains 2025" />
                      </label>
                      {form.isPYQ && (
                        <label>
                          Year
                          <input type="number" name="pyqYear" value={form.pyqYear} onChange={handleFormChange} placeholder="e.g. 2025" min="1990" max="2099" />
                        </label>
                      )}
                    </div>
                  </div>

                  <label>
                    Notes (optional)
                    <textarea name="notes" rows="2" value={form.notes} onChange={handleFormChange} placeholder="Anything worth remembering about this concept" />
                  </label>

                  <Button type="submit" disabled={creating} className={styles.submitBtn}>
                    {creating ? 'Creating…' : '✨ Create Concept'}
                  </Button>
                </form>
              </div>

              {createdConcept && (
                <div className={styles.createdCard}>
                  <span className={styles.createdLabel}>Concept created</span>
                  <div className={styles.createdIdRow}>
                    <code className={styles.createdId}>{createdConcept.conceptId}</code>
                  </div>
                  <p className={styles.createdHint}>
                    {createdConcept.pieces.length > 0
                      ? `${createdConcept.pieces.length} content piece(s) added — manage them in the list on the right.`
                      : 'No pieces added yet — use "+ Add piece" on the card to start adding content.'}
                  </p>
                </div>
              )}
            </div>

            <div className={styles.listCol}>
              <form className={styles.filterBar} onSubmit={handleSearchSubmit}>
                <input
                  className={styles.searchInput}
                  placeholder="Search concept, chapter, topic…"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
                <select value={filters.platform} onChange={(e) => setFilters((f) => ({ ...f, platform: e.target.value }))}>
                  <option value="">All platforms</option>
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                </select>
                <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
                  <option value="">All types</option>
                  {Object.entries(TYPE_META).map(([key, m]) => (
                    <option key={key} value={key}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" variant="ghost">
                  Search
                </Button>
                {(filters.status || filters.platform || filters.type || filters.search) && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setFilters({ status: '', platform: '', type: '', search: '' })}>
                    Clear
                  </Button>
                )}
              </form>

              {loading && <Spinner label="Loading concepts…" />}
              {error && <ErrorState message={error} onRetry={load} />}

              {concepts && concepts.length === 0 && !loading && (
                <div className={styles.emptyState}>No concepts match these filters yet — create one on the left to get started.</div>
              )}

              <div className={styles.conceptGrid}>
                {(concepts || []).map((concept) => {
                  const total = concept.pieces.length;
                  const publishedCount = concept.pieces.filter((p) => p.status === 'published').length;
                  const progressPct = total > 0 ? Math.round((publishedCount / total) * 100) : 0;

                  return (
                    <div key={concept._id} className={styles.conceptCard}>
                      <div className={styles.conceptHead}>
                        <div>
                          <button type="button" className={styles.conceptIdBadge} onClick={() => copyText(concept.conceptId)} title="Copy concept id">
                            {concept.conceptId} 📋
                          </button>
                          <h3 className={styles.conceptTitle}>{concept.title}</h3>
                          <div className={styles.conceptMeta}>
                            {concept.chapter && <span className={styles.metaChip}>📘 {concept.chapter}</span>}
                            {concept.topic && <span className={styles.metaChip}>🎯 {concept.topic}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={styles.conceptDeleteBtn}
                          disabled={busyKey === concept.conceptId}
                          onClick={() => handleDeleteConcept(concept)}
                        >
                          Delete
                        </button>
                      </div>

                      {total > 0 && (
                        <div className={styles.progressWrap}>
                          <div className={styles.progressTrack}>
                            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                          </div>
                          <span className={styles.progressLabel}>
                            {publishedCount}/{total} published
                          </span>
                        </div>
                      )}

                      {concept.notes && <p className={styles.conceptNotes}>{concept.notes}</p>}

                      <div className={styles.piecesGrid}>
                        {concept.pieces.map((piece) => {
                          const meta = STATUS_META[piece.status];
                          const next = NEXT_STATUS[piece.status];
                          const key = pieceKey(concept.conceptId, piece._id);
                          return (
                            <div key={piece._id} className={styles.pieceCard}>
                              <div className={styles.pieceHead}>
                                <span className={styles.pieceIcon}>
                                  {PLATFORM_META[piece.platform].icon} {TYPE_META[piece.type].icon}
                                </span>
                                <span className={styles.pieceLabel}>{piece.label || TYPE_META[piece.type].label}</span>
                                <button
                                  type="button"
                                  className={styles.pieceRemoveBtn}
                                  title="Remove piece"
                                  disabled={busyKey === key}
                                  onClick={() => handleRemovePiece(concept, piece)}
                                >
                                  ×
                                </button>
                              </div>
                              <button type="button" className={styles.pieceIdBadge} onClick={() => copyText(piece.pieceId)} title="Copy piece id">
                                {piece.pieceId}
                              </button>
                              <span className={`${styles.statusPill} ${styles[`statusPill_${meta.tone}`]}`}>
                                {meta.icon} {meta.label}
                              </span>
                              {piece.isPYQ && (
                                <span className={styles.pyqChip}>
                                  🏆 {piece.source || 'PYQ'} {piece.pyqYear || ''}
                                </span>
                              )}
                              <div className={styles.pieceActions}>
                                {next && (
                                  <button
                                    type="button"
                                    className={styles.advanceBtn}
                                    disabled={busyKey === key}
                                    onClick={() => handleAdvancePiece(concept, piece)}
                                  >
                                    {STATUS_META[next].label} →
                                  </button>
                                )}
                                <select
                                  className={styles.pieceStatusSelect}
                                  value={piece.status}
                                  disabled={busyKey === key}
                                  onChange={(e) => handleSetPieceStatus(concept, piece, e.target.value)}
                                >
                                  {Object.entries(STATUS_META).map(([k, m]) => (
                                    <option key={k} value={k}>
                                      {m.icon} {m.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {piece.link && (
                                <a href={piece.link} target="_blank" rel="noreferrer" className={styles.pieceLink}>
                                  🔗 Open link
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {addPieceFor === concept.conceptId ? (
                        <div className={styles.addPieceForm}>
                          <div className={styles.addPieceRow}>
                            <select
                              value={addPieceForm.platform}
                              onChange={(e) => setAddPieceForm((f) => ({ ...f, platform: e.target.value }))}
                            >
                              {Object.entries(PLATFORM_META).map(([k, m]) => (
                                <option key={k} value={k}>
                                  {m.icon} {m.label}
                                </option>
                              ))}
                            </select>
                            <select value={addPieceForm.type} onChange={(e) => setAddPieceForm((f) => ({ ...f, type: e.target.value }))}>
                              {Object.entries(TYPE_META).map(([k, m]) => (
                                <option key={k} value={k}>
                                  {m.icon} {m.label}
                                </option>
                              ))}
                            </select>
                            <input
                              placeholder="Label (optional)"
                              value={addPieceForm.label}
                              onChange={(e) => setAddPieceForm((f) => ({ ...f, label: e.target.value }))}
                            />
                          </div>
                          <div className={styles.addPieceRow}>
                            <input
                              placeholder="Source (optional)"
                              value={addPieceForm.source}
                              onChange={(e) => setAddPieceForm((f) => ({ ...f, source: e.target.value }))}
                            />
                            <label className={styles.addPiecePyqLabel}>
                              <input
                                type="checkbox"
                                checked={addPieceForm.isPYQ}
                                onChange={(e) => setAddPieceForm((f) => ({ ...f, isPYQ: e.target.checked }))}
                              />
                              PYQ
                            </label>
                            {addPieceForm.isPYQ && (
                              <input
                                type="number"
                                placeholder="Year"
                                value={addPieceForm.pyqYear}
                                onChange={(e) => setAddPieceForm((f) => ({ ...f, pyqYear: e.target.value }))}
                                className={styles.addPieceYearInput}
                              />
                            )}
                          </div>
                          <div className={styles.addPieceActions}>
                            <Button type="button" size="sm" disabled={busyKey === `add-${concept.conceptId}`} onClick={() => handleAddPiece(concept)}>
                              Add piece
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setAddPieceFor('')}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button type="button" variant="ghost" size="sm" onClick={() => openAddPiece(concept.conceptId)}>
                          + Add piece
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
