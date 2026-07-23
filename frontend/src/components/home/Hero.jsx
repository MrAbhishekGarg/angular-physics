import { Link } from 'react-router-dom';
import Container from '../common/Container.jsx';
import Button from '../common/Button.jsx';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero} id="hero">
      <Container className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>#PhysicsBoleTohAngularPhysics</p>
          <h1 className={styles.headline}>
            Find your <span className={styles.accent}>angle</span> to every Physics answer.
          </h1>
          <p className={styles.subhead}>
            Physics-only courses for JEE Main &amp; Advanced, NEET, and Physics Olympiads —
            mentored entirely by <strong>Abhishek Kumar Garg</strong>, producer of double-digit
            All India Ranks.
          </p>
          <div className={styles.ctas}>
            <Button as={Link} to="/courses" size="lg">
              View Courses
            </Button>
            <Button as="a" href="https://app.angularphysics.com" variant="ghost" size="lg">
              Login to Courses
            </Button>
          </div>
        </div>

        <div className={styles.visual} aria-hidden="true">
          <svg viewBox="0 0 320 320" className={styles.orbitArt}>
            <circle cx="160" cy="160" r="150" fill="none" stroke="#e5e3f5" strokeWidth="1.5" />
            <ellipse cx="160" cy="160" rx="140" ry="55" fill="none" stroke="#F59E0B" strokeWidth="2.5" transform="rotate(-20 160 160)" />
            <ellipse cx="160" cy="160" rx="140" ry="55" fill="none" stroke="#4338ca" strokeWidth="2" transform="rotate(40 160 160)" opacity="0.5" />
            <circle cx="160" cy="160" r="14" fill="#1E1B4B" />
            <circle cx="290" cy="120" r="7" fill="#F59E0B" />
            <circle cx="60" cy="220" r="5" fill="#4338ca" />
          </svg>
        </div>
      </Container>
    </section>
  );
}
