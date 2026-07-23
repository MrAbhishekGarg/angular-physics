import Container from '../common/Container.jsx';
import SectionHeading from '../common/SectionHeading.jsx';
import Stat from '../common/Stat.jsx';
import styles from './MentorSpotlight.module.css';

const MENTOR_STATS = [
  { value: '14+', label: 'Years of teaching Physics' },
  { value: '40+', label: 'Double-digit AIRs produced (IIT-JEE)' },
  { value: '25+', label: 'Double-digit AIRs produced (NEET)' },
  { value: '10,000+', label: 'Students mentored' },
];

export default function MentorSpotlight() {
  return (
    <section className={styles.section} aria-labelledby="mentor-heading">
      <Container>
        <SectionHeading
          eyebrow="Your Mentor"
          title="Learn Physics from Abhishek Kumar Garg"
          subtitle="Every single course on Angular Physics — JEE, NEET, or Olympiad — is designed and taught by one mentor, so the teaching philosophy never changes, only the syllabus does."
        />
        <div className={styles.grid}>
          {MENTOR_STATS.map((s) => (
            <Stat key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </Container>
    </section>
  );
}
