import styles from './PlaylistFilterBar.module.css';

export default function PlaylistFilterBar({ playlists, activePlaylistId, onChange, compact = false }) {
  return (
    <div className={`${styles.bar} ${compact ? styles.compact : ''}`} role="tablist" aria-label="Filter videos by playlist">
      <button
        type="button"
        role="tab"
        aria-selected={!activePlaylistId}
        className={`${styles.tab} ${!activePlaylistId ? styles.active : ''}`}
        onClick={() => onChange(null)}
      >
        All Videos
      </button>
      {playlists.map((p) => (
        <button
          key={p._id}
          type="button"
          role="tab"
          aria-selected={activePlaylistId === p._id}
          className={`${styles.tab} ${activePlaylistId === p._id ? styles.active : ''}`}
          onClick={() => onChange(p._id)}
        >
          {p.title} <span className={styles.count}>{p.videoCount}</span>
        </button>
      ))}
    </div>
  );
}
