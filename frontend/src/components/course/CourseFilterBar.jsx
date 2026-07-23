import { EXAM_TRACKS } from '../../data/examTracks.js';
import styles from './CourseFilterBar.module.css';

export default function CourseFilterBar({ activeTrack, onChange }) {
  return (
    <div className={styles.bar} role="tablist" aria-label="Filter courses by exam">
      <button
        type="button"
        role="tab"
        aria-selected={!activeTrack}
        className={`${styles.tab} ${!activeTrack ? styles.active : ''}`}
        onClick={() => onChange(null)}
      >
        All
      </button>
      {EXAM_TRACKS.map((track) => (
        <button
          key={track.key}
          type="button"
          role="tab"
          aria-selected={activeTrack === track.key}
          className={`${styles.tab} ${activeTrack === track.key ? styles.active : ''}`}
          onClick={() => onChange(track.key)}
        >
          <span aria-hidden="true">{track.icon}</span> {track.shortLabel}
        </button>
      ))}
    </div>
  );
}
