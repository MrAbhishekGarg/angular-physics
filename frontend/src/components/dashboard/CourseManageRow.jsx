import { Link } from 'react-router-dom';
import Badge from '../common/Badge.jsx';
import { formatPrice } from '../../data/courseFormat.js';
import { getTrackMeta } from '../../data/examTracks.js';

const STATUS_TONE = { open: 'success', 'launching-soon': 'launching', closed: 'default' };

export default function CourseManageRow({ course, onDelete, deleting }) {
  const track = getTrackMeta(course.track);

  return (
    <tr>
      <td>{course.title}</td>
      <td>{track?.shortLabel}</td>
      <td>{formatPrice(course.price, course.currency)}</td>
      <td>
        <Badge tone={STATUS_TONE[course.status]}>{course.status}</Badge>
      </td>
      <td>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={`/dashboard/mentor/courses/${course._id}/edit`} state={{ course }}>
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onDelete(course)}
            disabled={deleting}
            style={{ color: 'var(--ap-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
