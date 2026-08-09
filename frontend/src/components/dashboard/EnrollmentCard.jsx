import { Link } from 'react-router-dom';
import Card from '../common/Card.jsx';
import Badge from '../common/Badge.jsx';
import { formatPrice, formatDuration } from '../../data/courseFormat.js';
import { getTrackMeta } from '../../data/examTracks.js';
import styles from './EnrollmentCard.module.css';

const STATUS_TONE = { pending: 'accent', active: 'success', completed: 'launching', cancelled: 'default' };
const STATUS_LABEL = { pending: 'Pending Approval', active: 'Active', completed: 'Completed', cancelled: 'Cancelled' };

export default function EnrollmentCard({ enrollment }) {
  const course = enrollment.courseId;
  const track = getTrackMeta(course?.track);

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>{track?.icon}</span>
        <Badge tone={STATUS_TONE[enrollment.status]}>{STATUS_LABEL[enrollment.status]}</Badge>
      </div>
      <h3 className={styles.title}>{course?.title}</h3>
      <p className={styles.meta}>
        {track?.label} · {formatDuration(course?.durationWeeks)} · {formatPrice(course?.price)}
      </p>
      {enrollment.status !== 'pending' && enrollment.status !== 'cancelled' && (
        <div className={styles.progress}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${enrollment.progressPercent}%` }} />
          </div>
          <span className={styles.progressLabel}>{enrollment.progressPercent}% complete</span>
        </div>
      )}
      {(enrollment.status === 'active' || enrollment.status === 'completed') && (
        <Link to={`/dashboard/student/courses/${course?._id}/learn`} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Watch Lectures →
        </Link>
      )}
    </Card>

  );
}
