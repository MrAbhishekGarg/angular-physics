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

  const meta = STATUS_META[piece.status];
  const next = NEXT_STATUS[piece.status];
  const platformMeta = PLATFORM_META[piece.platform];

  return (
    <div
      className={styles.card}
      style={{ '--piece-color': meta.color }}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, concept, piece)}
      onDragEnd={onDragEnd}
    >
      <div className={styles.topRow}>
        <div className={styles.badgeGroup}>
          <span className={styles.platformBadge} style={{ '--platform-color': platformMeta.color }} title={platformMeta.label}>
            {platformMeta.icon}
          </span>
          <span className={styles.typeIcon} title={TYPE_META[piece.type].label}>
            {TYPE_META[piece.type].icon}
          </span>
        </div>
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
                ✏️ Edit
              </button>
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

      {(piece.isPYQ || (piece.status === 'scheduled' && piece.scheduledFor)) && (
        <div className={styles.chipsRow}>
          {piece.isPYQ && (
            <span className={styles.pyqChip}>
              🏆 {piece.source || 'PYQ'} {piece.pyqYear || ''}
            </span>
          )}
          {piece.status === 'scheduled' && piece.scheduledFor && (
            <span className={styles.scheduledChip}>📅 {new Date(piece.scheduledFor).toLocaleDateString()}</span>
          )}
        </div>
      )}

      <button type="button" className={styles.idBadge} onClick={() => copyText(piece.pieceId)} title="Copy piece id">
        {piece.pieceId}
      </button>

      <div className={styles.footer}>
        <select
          className={styles.statusSelect}
          style={{ background: meta.pillBg, color: meta.pillText }}
          value={piece.status}
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
