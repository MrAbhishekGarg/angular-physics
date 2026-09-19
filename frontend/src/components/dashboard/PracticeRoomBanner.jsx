import { Link } from 'react-router-dom';
import styles from './PracticeRoomBanner.module.css';

/** Compact cross-link nudging students toward the Practice Room from every
 * other student-facing library page — the "attractive toward practice"
 * homepage treatment (see StudentDashboard.jsx) shrunk down so it doesn't
 * dominate pages that aren't the home page. */
export default function PracticeRoomBanner() {
  return (
    <Link to="/dashboard/student/practice" className={styles.banner}>
      <span className={styles.icon}>🎮</span>
      <span>
        Short on a full test? Drop into the <strong>Practice Room</strong> for quick, gamified questions.
      </span>
      <span className={styles.arrow}>→</span>
    </Link>
  );
}
