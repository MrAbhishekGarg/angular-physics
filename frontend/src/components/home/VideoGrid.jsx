import { useState } from 'react';
import styles from './VideoGrid.module.css';

/**
 * Renders thumbnail cards (no API call — thumbnails load directly from
 * i.ytimg.com) that swap to a lazy-loaded iframe on click, so a homepage
 * with several videos never pays for 6+ embedded players up front.
 */
export default function VideoGrid({ videos }) {
  const [playingId, setPlayingId] = useState(null);

  return (
    <div className={styles.grid}>
      {videos.map((v) => (
        <div key={v.id} className={styles.card}>
          {playingId === v.id ? (
            <iframe
              className={styles.frame}
              src={`https://www.youtube.com/embed/${v.id}?autoplay=1`}
              title={v.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button type="button" className={styles.thumbButton} onClick={() => setPlayingId(v.id)}>
              <img src={v.thumbnailUrl} alt={v.title} className={styles.thumb} loading="lazy" />
              <span className={styles.playIcon} aria-hidden="true">
                ▶
              </span>
            </button>
          )}
          <p className={styles.title}>{v.title}</p>
        </div>
      ))}
    </div>
  );
}
