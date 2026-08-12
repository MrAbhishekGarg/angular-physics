import { Link } from 'react-router-dom';
import Card from '../common/Card.jsx';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import { getTrackMeta } from '../../data/examTracks.js';
import { formatPrice, formatDuration, discountPercent } from '../../data/courseFormat.js';
import { assetUrl } from '../../data/assetUrl.js';
import styles from './CourseCard.module.css';

export default function CourseCard({ course }) {
  const track = getTrackMeta(course.track);
  const discount = discountPercent(course.price, course.strikePrice);
  const isLaunchingSoon = course.status === 'launching-soon';

  return (
    <Card className={styles.card}>
      <span className={`${styles.trackTag} ${isLaunchingSoon ? styles.trackTagLaunching : ''}`}>
        <span aria-hidden="true">{track?.icon}</span> {isLaunchingSoon ? 'Launching Soon' : track?.shortLabel}
      </span>

      {course.imageUrl && (
        <img src={assetUrl(course.imageUrl)} alt="" className={styles.image} />
      )}

      <h3 className={styles.title}>{course.title}</h3>
      <p className={styles.tagline}>{course.tagline}</p>

      <ul className={styles.highlights}>
        {course.highlights?.slice(0, 3).map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>

      <div className={styles.meta}>
        <span>{formatDuration(course.durationWeeks)}</span>
        <span aria-hidden="true">·</span>
        <span>Mentor: {course.mentor}</span>
      </div>

      <div className={styles.footer}>
        <div className={styles.price}>
          <strong>{formatPrice(course.price, course.currency)}</strong>
          {course.strikePrice && <s className={styles.strike}>{formatPrice(course.strikePrice, course.currency)}</s>}
          {discount && <Badge tone="accent">{discount}% off</Badge>}
        </div>
        <Button as={Link} to={`/courses/${course.slug}`} size="sm" variant={isLaunchingSoon ? 'highlight' : 'primary'}>
          {isLaunchingSoon ? 'Notify Me' : 'View Course'}
        </Button>
      </div>
    </Card>
  );
}
