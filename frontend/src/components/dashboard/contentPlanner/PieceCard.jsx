import { useEffect, useRef, useState } from 'react';
import { STATUS_META, NEXT_STATUS, PLATFORM_META, TYPE_META } from '../../../data/contentPlannerMeta.js';
import styles from './PieceCard.module.css';

function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

/**
 * One content piece, shown identically on the board (grouped by status,
 * needs its parent concept's name on the card since nothing else nearby
 * says so) and inside a concept card (parent already shows the concept, so
 * `showConceptContext` is dropped to keep the card from repeating itself).
 */
export default function PieceCard({
  concept,
  piece,
  showConceptContext = false,
  busy = false,
  draggable = true,
  onDragStart,
  onDragEnd,
  onEdit,
  onRemove,
  onAdvance,
  onSetStatus,
  onEditConcept,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // onHold is a basket, not a pipeline stage (see ContentConcept.js) — the
  // card still reads piece.status for its real stage everywhere except the
  // accent color/select, which show "On Hold" while it's sitting in the
  // basket so it's visually obvious without losing track of that real stage.
  const meta = piece.onHold ? STATUS_META['on-hold'] : STATUS_META[piece.status];
  const next = piece.onHold ? null : NEXT_STATUS[piece.status];
  const platformMeta = PLATFORM_META[piece.platform];

  return (
    <div
      className={styles.card}
      style={{ '--piece-color': meta.color }}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, concept, piece)}
      onDragEnd={onDragEnd}
    >
      <div className={styles.menuWrap} ref={menuRef}>
        <button type="button" className={styles.menuBtn} title="More actions" onClick={() => setMenuOpen((o) => !o)}>
          ⋮
        </button>
        {menuOpen && (
          <div className={styles.menu}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit(concept, piece);
              }}
            >
              ✏️ Edit piece
            </button>
            {showConceptContext && onEditConcept && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEditConcept(concept);
                }}
              >
                📝 Edit concept
              </button>
            )}
            <button
              type="button"
              className={styles.menuDanger}
              onClick={() => {
                setMenuOpen(false);
                onRemove(concept, piece);
              }}
            >
              🗑️ Remove
            </button>
          </div>
        )}
      </div>

      <div className={styles.badgeRow}>
        <span className={styles.platformBadge} style={{ '--platform-color': platformMeta.color }}>
          {platformMeta.icon} {platformMeta.label}
        </span>
        <span className={styles.typeBadge} style={{ '--type-color': TYPE_META[piece.type].color }}>
          {TYPE_META[piece.type].icon} {TYPE_META[piece.type].label}
        </span>
      </div>

      {showConceptContext && (
        <>
          <div className={styles.conceptTitleLine}>{concept.title}</div>
          {(concept.chapter || concept.topic) && (
            <div className={styles.conceptSubLine}>
              {concept.chapter}
              {concept.chapter && concept.topic ? ' · ' : ''}
              {concept.topic}
            </div>
          )}
        </>
      )}
      <div className={showConceptContext ? styles.pieceTypeLineSecondary : styles.pieceTypeLine}>
        {piece.label || TYPE_META[piece.type].label}
      </div>

      {(piece.isPYQ || (piece.status === 'scheduled' && piece.scheduledFor) || (piece.status === 'published' && piece.publishedAt)) && (
        <div className={styles.chipsRow}>
          {piece.isPYQ && (
            <span className={styles.pyqChip}>
              🏆 {piece.source || 'PYQ'} {piece.pyqYear || ''}
            </span>
          )}
          {piece.status === 'scheduled' && piece.scheduledFor && (
            <span className={styles.scheduledChip}>📅 {new Date(piece.scheduledFor).toLocaleDateString()}</span>
          )}
          {piece.status === 'published' && piece.publishedAt && (
            <span className={styles.publishedChip}>
              ✅ Published {new Date(piece.publishedAt).toLocaleDateString()}{' '}
              {new Date(piece.publishedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      <button type="button" className={styles.idBadge} onClick={() => copyText(piece.pieceId)} title="Copy piece id">
        {piece.pieceId}
      </button>

      {piece.onHold && (
        <p className={styles.holdHint}>⏸️ On hold — was at {STATUS_META[piece.status].label}</p>
      )}

      <div className={styles.footer}>
        <select
          className={styles.statusSelect}
          style={{ background: meta.pillBg, color: meta.pillText }}
          value={piece.onHold ? 'on-hold' : piece.status}
          disabled={busy}
          onChange={(e) => onSetStatus(concept, piece, e.target.value)}
        >
          {Object.entries(STATUS_META).map(([k, m]) => (
            <option key={k} value={k}>
              {m.icon} {m.label}
            </option>
          ))}
        </select>
        {next && (
          <button
            type="button"
            className={styles.advanceBtn}
            disabled={busy}
            title={`Advance to ${STATUS_META[next].label}`}
            onClick={() => onAdvance(concept, piece)}
          >
            →
          </button>
        )}
        {piece.link && (
          <a className={styles.linkBtn} href={piece.link} target="_blank" rel="noreferrer" title="Open link">
            🔗
          </a>
        )}
      </div>
    </div>
  );
}
