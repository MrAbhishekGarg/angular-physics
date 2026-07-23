import CourseCard from './CourseCard.jsx';
import Spinner from '../common/Spinner.jsx';
import ErrorState from '../common/ErrorState.jsx';
import styles from './CourseGrid.module.css';

/**
 * Renders a grid of CourseCards and owns the loading/error/empty states
 * so every page that lists courses (Home's featured section, /courses,
 * track-filtered views) doesn't reimplement that branching.
 */
export default function CourseGrid({ courses, loading, error, onRetry, emptyMessage = 'No courses found.' }) {
  if (loading) return <Spinner label="Loading courses…" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!courses?.length) return <ErrorState message={emptyMessage} />;

  return (
    <div className={styles.grid}>
      {courses.map((course) => (
        <CourseCard key={course.slug} course={course} />
      ))}
    </div>
  );
}
