import Container from '../common/Container.jsx';
import SectionHeading from '../common/SectionHeading.jsx';
import CourseGrid from '../course/CourseGrid.jsx';
import Button from '../common/Button.jsx';
import { useFeaturedCourses } from '../../hooks/useCourses.js';
import { Link } from 'react-router-dom';
import styles from './FeaturedCourses.module.css';

export default function FeaturedCourses() {
  const { data: courses, loading, error, refetch } = useFeaturedCourses();

  return (
    <section className={styles.section} id="courses" aria-labelledby="courses-heading">
      <Container>
        <SectionHeading
          eyebrow="Courses for 2027"
          title="Physics courses for every Physics exam"
          subtitle="IIT-JEE, NEET, Olympiads and foundation programs — every batch mentored by Abhishek Garg."
        />
        <CourseGrid courses={courses} loading={loading} error={error} onRetry={refetch} />
        <div className={styles.viewAll}>
          <Button as={Link} to="/courses" variant="ghost">
            View All Courses
          </Button>
        </div>
      </Container>
    </section>
  );
}
