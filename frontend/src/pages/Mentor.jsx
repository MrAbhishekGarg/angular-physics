import SEO from '../components/seo/SEO.jsx';
import JsonLd from '../components/seo/JsonLd.jsx';
import Container from '../components/common/Container.jsx';
import Stat from '../components/common/Stat.jsx';
import styles from './Mentor.module.css';

const mentorSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Abhishek Kumar Garg',
  jobTitle: 'Founder & Lead Physics Mentor, Angular Physics',
  description:
    'Physics educator specializing in IIT-JEE, NEET and Physics Olympiad preparation, with over a decade of experience producing double-digit All India Ranks.',
  worksFor: { '@type': 'EducationalOrganization', name: 'Angular Physics' },
};

export default function Mentor() {
  return (
    <>
      <SEO
        title="Meet Abhishek Kumar Garg — Physics Mentor"
        description="Abhishek Kumar Garg is the founder and lead mentor at Angular Physics, with 14+ years of experience producing double-digit AIRs in IIT-JEE and NEET."
        path="/mentor"
      />
      <JsonLd schema={mentorSchema} />

      <main>
        <Container>
          <div className={styles.wrap}>
            <h1 className={styles.title}>Abhishek Kumar Garg</h1>
            <p className={styles.role}>Founder &amp; Lead Physics Mentor, Angular Physics</p>

            <p className={styles.bio}>
              Abhishek Kumar Garg has spent over 14 years teaching Physics to IIT-JEE and NEET
              aspirants, refining a concept-first, angle-based approach to problem solving that
              has helped students turn Physics from their weakest subject into their strongest.
              He personally designs and mentors every course on Angular Physics — from Class 11
              foundation batches to Olympiad-level problem sets — so the teaching philosophy
              never changes, only the syllabus does.
            </p>

            <div className={styles.stats}>
              <Stat value="14+" label="Years teaching Physics" />
              <Stat value="40+" label="Double-digit AIRs (IIT-JEE)" />
              <Stat value="25+" label="Double-digit AIRs (NEET)" />
              <Stat value="10,000+" label="Students mentored" />
            </div>
          </div>
        </Container>
      </main>
    </>
  );
}
