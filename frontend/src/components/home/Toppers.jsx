import Container from '../common/Container.jsx';
import SectionHeading from '../common/SectionHeading.jsx';
import Card from '../common/Card.jsx';
import { useToppers } from '../../hooks/useToppers.js';
import styles from './Toppers.module.css';

export default function Toppers() {
  const { data: toppers } = useToppers();

  if (!toppers || toppers.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="toppers-heading">
      <Container>
        <SectionHeading eyebrow="Our Toppers" title="Meet our ongoing batches' top rankers" subtitle="Real students, real results, still in the program." />
        <div className={styles.grid}>
          {toppers.map((t) => (
            <Card key={t._id} className={styles.card}>
              {t.photoUrl ? (
                <img src={t.photoUrl} alt={t.name} className={styles.photo} />
              ) : (
                <div className={styles.photoPlaceholder} aria-hidden="true">
                  {t.name.charAt(0)}
                </div>
              )}
              <strong className={styles.name}>{t.name}</strong>
              <span className={styles.achievement}>{t.achievement}</span>
              {t.courseId?.title && <span className={styles.batch}>{t.courseId.title}</span>}
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
