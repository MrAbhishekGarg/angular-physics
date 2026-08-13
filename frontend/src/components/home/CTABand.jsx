import { Link } from 'react-router-dom';
import Container from '../common/Container.jsx';
import Button from '../common/Button.jsx';
import styles from './CTABand.module.css';

export default function CTABand({
  title = 'Ready to find your angle in Physics?',
  subtitle = 'Join a batch mentored by Abhishek Garg today.',
  ctaLabel = 'Explore Courses',
  ctaTo = '/courses',
}) {
  return (
    <section className={styles.band}>
      <Container className={styles.inner}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <Button as={Link} to={ctaTo} size="lg">
          {ctaLabel}
        </Button>
      </Container>
    </section>
  );
}
