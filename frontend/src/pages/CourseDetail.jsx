import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SEO from '../components/seo/SEO.jsx';
import JsonLd, { courseSchema } from '../components/seo/JsonLd.jsx';
import Container from '../components/common/Container.jsx';
import Badge from '../components/common/Badge.jsx';
import Button from '../components/common/Button.jsx';
import Spinner from '../components/common/Spinner.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import { useCourse } from '../hooks/useCourses.js';
import { useAuth, isMentorRole } from '../hooks/useAuth.js';
import { enrollmentService } from '../services/enrollmentService.js';
import { formatPrice, formatDuration } from '../data/courseFormat.js';
import { getTrackMeta } from '../data/examTracks.js';
import WhatsAppButton from '../components/common/WhatsAppButton.jsx';
import styles from './CourseDetail.module.css';

export default function CourseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: course, loading, error, refetch } = useCourse(slug);
  const [enrollState, setEnrollState] = useState('idle'); // idle | submitting | requested | error
  const [enrollError, setEnrollError] = useState('');

  if (loading) return <Spinner label="Loading course…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!course) return null;

  const track = getTrackMeta(course.track);

  const handleEnroll = async () => {
    setEnrollState('submitting');
    try {
      await enrollmentService.enroll(course._id);
      setEnrollState('requested');
    } catch (err) {
      setEnrollError(err.message);
      setEnrollState('error');
    }
  };

  return (
    <>
      <SEO title={course.title} description={course.description} path={`/courses/${course.slug}`} />
      <JsonLd schema={courseSchema(course)} />

      <main>
        <Container>
          <div className={styles.wrap}>
            <Link to="/courses" className={styles.back}>
              ← All courses
            </Link>

            <Badge>{track?.label}</Badge>
            <h1 className={styles.title}>{course.title}</h1>
            <p className={styles.tagline}>{course.tagline}</p>

            <div className={styles.metaRow}>
              <span>Mentor: <strong>{course.mentor}</strong></span>
              <span>Duration: {formatDuration(course.durationWeeks)}</span>
              <span>Level: {course.level}</span>
            </div>

            <p className={styles.description}>{course.description}</p>

            {course.highlights?.length > 0 && (
              <ul className={styles.highlights}>
                {course.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}

            <div className={styles.enroll}>
              <span className={styles.price}>{formatPrice(course.price, course.currency)}</span>
              {isMentorRole(user?.role) ? (
                <Button
                  size="lg"
                  onClick={() => navigate(`/dashboard/mentor/courses/${course._id}/edit`, { state: { course } })}
                >
                  Edit This Course
                </Button>
              ) : (
                <div className={styles.enrollActions}>
                  <WhatsAppButton
                    message={`Hi! I'd like to enroll in "${course.title}" (${formatPrice(course.price, course.currency)}). Please share the payment details.`}
                  >
                    Contact on WhatsApp to Pay
                  </WhatsAppButton>
                  {!user ? (
                    <Button as={Link} to="/login" size="lg" variant="ghost">
                      Login to Track Enrollment
                    </Button>
                  ) : enrollState === 'requested' ? (
                    <Badge tone="accent">Enrollment Pending Approval</Badge>
                  ) : (
                    <Button size="lg" variant="ghost" disabled={enrollState === 'submitting'} onClick={handleEnroll}>
                      {enrollState === 'submitting'
                        ? 'Sending…'
                        : course.status === 'launching-soon'
                          ? 'Notify Me'
                          : 'Request Enrollment'}
                    </Button>
                  )}
                </div>
              )}
            </div>
            {enrollState === 'error' && <p className={styles.errorMsg}>{enrollError}</p>}
          </div>
        </Container>
      </main>
    </>
  );
}
