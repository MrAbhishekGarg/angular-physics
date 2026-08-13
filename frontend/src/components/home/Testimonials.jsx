import Container from '../common/Container.jsx';
import SectionHeading from '../common/SectionHeading.jsx';
import Card from '../common/Card.jsx';
import Spinner from '../common/Spinner.jsx';
import ErrorState from '../common/ErrorState.jsx';
import { useTestimonials } from '../../hooks/useCourses.js';
import styles from './Testimonials.module.css';

export default function Testimonials() {
  const { data: testimonials, loading, error, refetch } = useTestimonials();

  return (
    <section className={styles.section} aria-labelledby="testimonials-heading">
      <Container>
        <SectionHeading
          eyebrow="Our Shining Stars"
          title="Students who found their angle"
          subtitle="Real results from students mentored by Abhishek Garg."
        />

        {loading && <Spinner label="Loading student stories…" />}
        {error && <ErrorState message={error} onRetry={refetch} />}

        {testimonials && (
          <div className={styles.grid}>
            {testimonials.map((t) => (
              <Card key={t.studentName} className={styles.card}>
                <p className={styles.quote}>&ldquo;{t.quote}&rdquo;</p>
                <div className={styles.author}>
                  <strong>{t.studentName}</strong>
                  <span>{t.result}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
