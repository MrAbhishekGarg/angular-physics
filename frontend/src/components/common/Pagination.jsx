import styles from './Pagination.module.css';

/**
 * Plain client-side pager — every list this is used on already fetches its
 * full result set in one call (no backend skip/limit support), so this just
 * slices what's already in memory rather than re-fetching per page. Fine at
 * the scale these lists actually run at; only the rendering was the
 * problem ("don't show everything on the same page").
 */
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const window = 1;
  for (let p = 1; p <= totalPages; p += 1) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= window) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button type="button" className={styles.navBtn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Prev
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className={styles.ellipsis}>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button type="button" className={styles.navBtn} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next →
      </button>
    </nav>
  );
}
