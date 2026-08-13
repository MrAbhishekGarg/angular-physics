import { useState } from 'react';
import styles from './MentorPhoto.module.css';

/**
 * Reads from /public (not a bundled asset import) specifically so a missing
 * file degrades to "renders nothing" instead of breaking the Vite build —
 * drop a real photo at frontend/public/mentor-photo.jpg and it just works,
 * no code change needed.
 */
export default function MentorPhoto({ className = '' }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <img
      src="/mentor-photo.jpg"
      alt="Abhishek Garg, founder and lead Physics mentor at Angular Physics"
      className={`${styles.photo} ${className}`}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
