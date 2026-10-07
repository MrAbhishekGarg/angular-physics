import { useState } from 'react';
import SEO from '../components/seo/SEO.jsx';
import Container from '../components/common/Container.jsx';
import CoursesHero from '../components/course/CoursesHero.jsx';
import CourseFilterBar from '../components/course/CourseFilterBar.jsx';
import CourseGrid from '../components/course/CourseGrid.jsx';
import WhatsAppButton from '../components/common/WhatsAppButton.jsx';
import { useCourses } from '../hooks/useCourses.js';
import styles from './Courses.module.css';

export default function Courses() {
  const [activeTrack, setActiveTrack] = useState(null);
  const { data: courses, loading, error, refetch } = useCourses(activeTrack);

  return (
    <>
      <SEO
        title="All Physics Courses"
        description="Browse every Angular Physics course — IIT-JEE, NEET, Physics Olympiads, foundation & crash courses — all mentored by Abhishek Garg."
        path="/courses"
      />
      <main>
        <CoursesHero count={courses?.length} />
        <Container>
          <div className={styles.body}>
            <CourseFilterBar activeTrack={activeTrack} onChange={setActiveTrack} />
            <CourseGrid
              courses={courses}
              loading={loading}
              error={error}
              onRetry={refetch}
              emptyMessage="No courses found for this track yet — check back soon."
            />

            <div className={styles.helpBanner}>
              <div>
                <h3 className={styles.helpTitle}>Not sure which batch fits you?</h3>
                <p className={styles.helpText}>Tell us your exam and target — we'll point you to the right course.</p>
              </div>
              <WhatsAppButton message="Hi! I'm looking for the right Angular Physics batch for my exam prep — can you help me choose?">
                Ask on WhatsApp
              </WhatsAppButton>
            </div>
          </div>
        </Container>
      </main>
    </>
  );
}
