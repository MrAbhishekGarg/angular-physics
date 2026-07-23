import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import Container from '../../components/common/Container.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import Stat from '../../components/common/Stat.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EnrollmentCard from '../../components/dashboard/EnrollmentCard.jsx';
import { useStudentAnalytics } from '../../hooks/useAnalytics.js';
import { useAuth } from '../../hooks/useAuth.js';
import styles from './Dashboard.module.css';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useStudentAnalytics();

  return (
    <>
      <SEO title="Student Dashboard" description="Track your enrolled courses and progress." path="/dashboard/student" />
      <main>
        <Container>
          <div className={styles.wrap}>
            <SectionHeading align="left" eyebrow="Student Dashboard" title={`Welcome back, ${user?.name}`} />

            {loading && <Spinner label="Loading your dashboard…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}

            {data && (
              <>
                <div className={styles.statRow}>
                  <Stat value={data.enrolledCount} label="Courses Enrolled" />
                  <Stat value={data.activeCount} label="Active" />
                  <Stat value={data.completedCount} label="Completed" />
                  <Stat value={data.leadsSubmittedCount} label="Enquiries Sent" />
                </div>

                <div className={styles.sectionRow}>
                  <h2 className={styles.sectionTitle}>Your Courses</h2>
                  <Button as={Link} to="/courses" variant="ghost" size="sm">
                    Browse More Courses
                  </Button>
                </div>

                {data.enrollments.length === 0 ? (
                  <ErrorState message="You haven't enrolled in any courses yet." />
                ) : (
                  <div className={styles.grid}>
                    {data.enrollments.map((enrollment) => (
                      <EnrollmentCard key={enrollment._id} enrollment={enrollment} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Container>
      </main>
    </>
  );
}
