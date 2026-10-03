import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import PieceCard from '../../components/dashboard/contentPlanner/PieceCard.jsx';
import NewConceptModal from '../../components/dashboard/contentPlanner/NewConceptModal.jsx';
import EditConceptModal from '../../components/dashboard/contentPlanner/EditConceptModal.jsx';
import PieceFormModal from '../../components/dashboard/contentPlanner/PieceFormModal.jsx';
import HoldPieceModal from '../../components/dashboard/contentPlanner/HoldPieceModal.jsx';
import { contentPlannerService } from '../../services/contentPlannerService.js';
import { questionService } from '../../services/questionService.js';
import { STATUS_META, STATUS_ORDER, NEXT_STATUS, PLATFORM_META, TYPE_META } from '../../data/contentPlannerMeta.js';
import { api } from '../../services/api.js';
import styles from './ContentPlanner.module.css';

const BOARD_COLUMNS = STATUS_ORDER.concat('on-hold');

function pieceKey(conceptId, pieceId) {
  return `${conceptId}:${pieceId}`;
}

function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

function reportLink(params) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
  return `/dashboard/mentor/admin/content-planner/report${qs ? `?${qs}` : ''}`;
}

export default function ContentPlanner() {
  const [view, setView] = useState('board');
  const [questionTaxonomy, setQuestionTaxonomy] = useState(null);
  const [usedTopics, setUsedTopics] = useState(null);
  const [concepts, setConcepts] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [filters, setFilters] = useState({ status: '', platform: '', type: '', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [sheetsStatus, setSheetsStatus] = useState(null);
  const [resyncing, setResyncing] = useState(false);
  const [resyncMessage, setResyncMessage] = useState('');

  const [showNewConcept, setShowNewConcept] = useState(false);
  const [editingConcept, setEditingConcept] = useState(null);
  const [pieceModal, setPieceModal] = useState(null); // { concept, piece? }
  const [holdModal, setHoldModal] = useState(null); // { concept, piece }
  const [successBanner, setSuccessBanner] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState('');
  const [draggingKey, setDraggingKey] = useState('');

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
  }, [filters.status, filters.platform, filters.type, filters.search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: searchInput }));
  };

  const handleCreateConcept = async (payload) => {
    const concept = await contentPlannerService.create(payload);
    setShowNewConcept(false);
    setSuccessBanner(
      concept.pieces.length > 0
        ? `✨ Created "${concept.title}" (${concept.conceptId}) — ${concept.pieces.length} piece(s) added.`
        : `✨ Created "${concept.title}" (${concept.conceptId}) — use "+ Add piece" to start adding content.`
    );
    await Promise.all([load(), loadUsedTopics()]);
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

  const handleEditConcept = async (payload) => {
    await contentPlannerService.update(editingConcept.conceptId, payload);
    setEditingConcept(null);
    await Promise.all([load(), loadUsedTopics()]);
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
    if (status === 'on-hold') {
      if (piece.onHold) return; // already in the basket
      setHoldModal({ concept, piece });
      return;
    }
    if (status === piece.status && !piece.onHold) return;
    const key = pieceKey(concept.conceptId, piece._id);
    setBusyKey(key);
    try {
      // Picking a real status directly (including on an on-hold piece) both
      // sets the stage and takes it off hold — no confirmation needed for
      // that direction, only for entering the basket (see handleConfirmHold).
      await contentPlannerService.updatePieceStatus(concept.conceptId, piece._id, status, false);
      await load();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const handleConfirmHold = async (realStatus) => {
    const { concept, piece } = holdModal;
    const key = pieceKey(concept.conceptId, piece._id);
    setBusyKey(key);
    try {
      await contentPlannerService.updatePieceStatus(concept.conceptId, piece._id, realStatus, true);
      setHoldModal(null);
      await load();
    } finally {
      setBusyKey('');
    }
  };

  const handleRemovePiece = async (concept, piece) => {
    if (!window.confirm(`Remove piece "${piece.pieceId}"? This can't be undone.`)) return;
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

  const handlePieceFormSubmit = async (payload) => {
    const { concept, piece } = pieceModal;
    if (piece) {
      await contentPlannerService.updatePiece(concept.conceptId, piece._id, payload);
    } else {
      await contentPlannerService.addPiece(concept.conceptId, payload);
    }
    setPieceModal(null);
    await load();
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

  const handleDragStart = (e, concept, piece) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ conceptId: concept.conceptId, pieceId: piece._id }));
    setDraggingKey(pieceKey(concept.conceptId, piece._id));
  };
  const handleDragEnd = () => {
    setDraggingKey('');
    setDragOverStatus('');
  };
  const handleColumnDrop = async (e, status) => {
    e.preventDefault();
    setDragOverStatus('');
    let payload;
    try {
      payload = JSON.parse(e.dataTransfer.getData('application/json'));
    } catch {
      return;
    }
    if (!payload) return;
    const dropped = flatPieces.find(({ concept, piece }) => concept.conceptId === payload.conceptId && piece._id === payload.pieceId);
    if (status === 'on-hold') {
      if (dropped && !dropped.piece.onHold) setHoldModal({ concept: dropped.concept, piece: dropped.piece });
      return;
    }
    setBusyKey(pieceKey(payload.conceptId, payload.pieceId));
    try {
      await contentPlannerService.updatePieceStatus(payload.conceptId, payload.pieceId, status, false);
      await load();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const flatPieces = useMemo(
    () => (concepts || []).flatMap((concept) => concept.pieces.map((piece) => ({ concept, piece }))),
    [concepts]
  );
  // "On Hold" is a basket keyed off piece.onHold, not a real pipeline stage
  // (see ContentConcept.js) — a held piece's own `status` still reflects
  // whatever stage it's actually at, so it has to be pulled out of its real
  // status column and grouped under "on-hold" here instead.
  const piecesByStatus = useMemo(() => {
    const grouped = {};
    BOARD_COLUMNS.forEach((s) => {
      grouped[s] = [];
    });
    flatPieces.forEach(({ concept, piece }) => {
      const column = piece.onHold ? 'on-hold' : piece.status;
      (grouped[column] || (grouped[column] = [])).push({ concept, piece });
    });
    return grouped;
  }, [flatPieces]);

  const exportUrl = `${api.defaults.baseURL}/content-planner/export`;

  return (
    <>
      <SEO title="Content Planner" description="Plan and track YouTube and Instagram content by concept." path="/dashboard/mentor/admin/content-planner" />
      <DashboardLayout role="mentor" crossLinksExclude={['/dashboard/mentor/admin/content-planner/report']}>
        <div className={styles.wrap}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>🗂️ Content Planner</h1>
              <p className={styles.subtitle}>
                Plan a concept once, spin up every piece of content it needs, then drag pieces across the board as they move
                through recording, editing, and publishing on YouTube and Instagram.
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

          {successBanner && (
            <div className={styles.successBanner}>
              <span>{successBanner}</span>
              <button type="button" onClick={() => setSuccessBanner(null)} aria-label="Dismiss">
                ×
              </button>
            </div>
          )}

          <div className={styles.toolbar}>
            <div className={styles.toolbarTop}>
              <div className={styles.viewToggle}>
                <button type="button" className={view === 'board' ? styles.viewBtnActive : styles.viewBtn} onClick={() => setView('board')}>
                  📋 Board
                </button>
                <button type="button" className={view === 'concepts' ? styles.viewBtnActive : styles.viewBtn} onClick={() => setView('concepts')}>
                  🗂️ By Concept
                </button>
              </div>
              <Link to={reportLink({})} className={styles.reportLink}>
                📊 Full report ↗
              </Link>
              <Button type="button" onClick={() => setShowNewConcept(true)} className={styles.newConceptBtn}>
                + New Concept
              </Button>
            </div>

            <form className={styles.filterBar} onSubmit={handleSearchSubmit}>
              <input
                className={styles.searchInput}
                placeholder="Search concept, chapter, topic…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {view === 'concepts' && (
                <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                  <option value="">All statuses</option>
                  {Object.entries(STATUS_META).map(([key, m]) => (
                    <option key={key} value={key}>
                      {m.icon} {m.label}
                    </option>
                  ))}
                </select>
              )}
              <select value={filters.platform} onChange={(e) => setFilters((f) => ({ ...f, platform: e.target.value }))}>
                <option value="">All platforms</option>
                {Object.entries(PLATFORM_META).map(([key, m]) => (
                  <option key={key} value={key}>
                    {m.icon} {m.label}
                  </option>
                ))}
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
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSearchInput('');
                    setFilters({ status: '', platform: '', type: '', search: '' });
                  }}
                >
                  Clear
                </Button>
              )}
            </form>
          </div>

          {stats && (
            <div className={styles.summaryStrip}>
              <Link to={reportLink({})} className={styles.summaryStripItem}>
                <strong>{stats.totalConcepts}</strong> concepts
              </Link>
              <Link to={reportLink({})} className={styles.summaryStripItem}>
                <strong>{stats.totalPieces}</strong> content pieces
              </Link>
              {['scripted', 'recorded', 'edited', 'uploaded'].map((s) => (
                <Link key={s} to={reportLink({ status: s })} className={styles.summaryStripItem}>
                  <strong style={{ color: STATUS_META[s].color }}>{stats.counts[s] ?? 0}</strong> {STATUS_META[s].actionHint || STATUS_META[s].label}
                </Link>
              ))}
            </div>
          )}

          {loading && <Spinner label="Loading content planner…" />}
          {error && <ErrorState message={error} onRetry={load} />}

          {!loading && !error && view === 'board' && (
            <div className={styles.board}>
              {BOARD_COLUMNS.map((status) => {
                const meta = STATUS_META[status];
                const items = piecesByStatus[status] || [];
                return (
                  <div
                    key={status}
                    className={`${styles.column} ${dragOverStatus === status ? styles.columnDragOver : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverStatus !== status) setDragOverStatus(status);
                    }}
                    onDragLeave={() => setDragOverStatus((s) => (s === status ? '' : s))}
                    onDrop={(e) => handleColumnDrop(e, status)}
                  >
                    <div className={styles.columnHead} style={{ '--col-color': meta.color }}>
                      <span className={styles.columnTitle}>
                        {meta.icon} {meta.label}
                      </span>
                      <span className={styles.columnCount}>{items.length}</span>
                    </div>
                    {meta.actionHint && <div className={styles.columnHint}>{meta.actionHint}</div>}
                    <div className={styles.columnBody}>
                      {items.length === 0 ? (
                        <div className={styles.columnEmpty}>Nothing here</div>
                      ) : (
                        items.map(({ concept, piece }) => (
                          <div
                            key={piece._id}
                            className={draggingKey === pieceKey(concept.conceptId, piece._id) ? styles.cardDragging : ''}
                          >
                            <PieceCard
                              concept={concept}
                              piece={piece}
                              showConceptContext
                              busy={busyKey === pieceKey(concept.conceptId, piece._id)}
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                              onEdit={(c, p) => setPieceModal({ concept: c, piece: p })}
                              onRemove={handleRemovePiece}
                              onAdvance={handleAdvancePiece}
                              onSetStatus={handleSetPieceStatus}
                              onEditConcept={setEditingConcept}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !error && view === 'concepts' && (
            <>
              {concepts && concepts.length === 0 && (
                <div className={styles.emptyState}>No concepts match these filters yet — create one to get started.</div>
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
                        <div className={styles.conceptHeadActions}>
                          <button type="button" className={styles.conceptEditBtn} onClick={() => setEditingConcept(concept)}>
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className={styles.conceptDeleteBtn}
                            disabled={busyKey === concept.conceptId}
                            onClick={() => handleDeleteConcept(concept)}
                          >
                            Delete
                          </button>
                        </div>
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
                        {concept.pieces.map((piece) => (
                          <PieceCard
                            key={piece._id}
                            concept={concept}
                            piece={piece}
                            busy={busyKey === pieceKey(concept.conceptId, piece._id)}
                            draggable={false}
                            onEdit={(c, p) => setPieceModal({ concept: c, piece: p })}
                            onRemove={handleRemovePiece}
                            onAdvance={handleAdvancePiece}
                            onSetStatus={handleSetPieceStatus}
                          />
                        ))}
                      </div>

                      <Button type="button" variant="ghost" size="sm" onClick={() => setPieceModal({ concept, piece: null })}>
                        + Add piece
                      </Button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </DashboardLayout>

      {showNewConcept && (
        <NewConceptModal
          onClose={() => setShowNewConcept(false)}
          onCreate={handleCreateConcept}
          questionTaxonomy={questionTaxonomy}
          usedTopics={usedTopics}
        />
      )}
      {pieceModal && (
        <PieceFormModal
          concept={pieceModal.concept}
          piece={pieceModal.piece}
          onClose={() => setPieceModal(null)}
          onSubmit={handlePieceFormSubmit}
        />
      )}
      {holdModal && <HoldPieceModal piece={holdModal.piece} onClose={() => setHoldModal(null)} onConfirm={handleConfirmHold} />}
      {editingConcept && (
        <EditConceptModal
          concept={editingConcept}
          onClose={() => setEditingConcept(null)}
          onSubmit={handleEditConcept}
          questionTaxonomy={questionTaxonomy}
          usedTopics={usedTopics}
        />
      )}
    </>
  );
}
