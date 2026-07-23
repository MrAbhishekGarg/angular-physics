import { useState } from 'react';
import SEO from '../components/seo/SEO.jsx';
import Container from '../components/common/Container.jsx';
import SectionHeading from '../components/common/SectionHeading.jsx';
import CourseFilterBar from '../components/course/CourseFilterBar.jsx';
import CourseGrid from '../components/course/CourseGrid.jsx';
import { useCourses } from '../hooks/useCourses.js';

export default function Courses() {
  const [activeTrack, setActiveTrack] = useState(null);
  const { data: courses, loading, error, refetch } = useCourses(activeTrack);

  return (
    <>
      <SEO
        title="All Physics Courses"
        description="Browse every Angular Physics course — IIT-JEE, NEET, Physics Olympiads, foundation & crash courses — all mentored by Abhishek Kumar Garg."
        path="/courses"
      />
      <main>
        <Container>
          <div style={{ paddingTop: 'var(--ap-space-xl)' }}>
            <SectionHeading
              align="left"
              eyebrow="All Courses"
              title="Every Physics course, one mentor"
              subtitle="Filter by exam to find the right batch for you."
            />
            <CourseFilterBar activeTrack={activeTrack} onChange={setActiveTrack} />
            <CourseGrid
              courses={courses}
              loading={loading}
              error={error}
              onRetry={refetch}
              emptyMessage="No courses found for this track yet — check back soon."
            />
          </div>
        </Container>
      </main>
    </>
  );
}
