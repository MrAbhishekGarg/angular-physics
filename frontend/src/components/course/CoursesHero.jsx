import Container from '../common/Container.jsx';
import AnimatedNumber from '../common/AnimatedNumber.jsx';
import styles from './CoursesHero.module.css';

const STATS = [
  { value: '200+', label: 'Double-digit AIRs mentored', accent: true },
  { value: '4,800+', label: 'Students taught' },
  { value: '3', label: 'Tracks — JEE, NEET, Olympiad' },
];

export default function CoursesHero({ count }) {
  return (
    <>
      <section className={styles.hero}>
        <Container className={styles.inner}>
          <p className={styles.eyebrow}>
            <span aria-hidden="true">&#8736;</span> All Batches
          </p>
          <h1 className={styles.headline}>
            Every Physics course, <span className={styles.accent}>one mentor</span>
          </h1>
          <p className={styles.subhead}>
            {count != null ? `${count} live and upcoming ` : ''}batches for JEE Main &amp; Advanced, NEET, and Physics
            Olympiads — filter by exam below to find the right one for you.
          </p>
        </Container>
      </section>

      <div className={styles.statStripWrap}>
        <Container>
          <div className={styles.statStrip}>
            {STATS.map((s) => (
              <div key={s.label} className={styles.stat}>
                <div className={`${styles.statNum} ${s.accent ? styles.statNumAccent : ''}`}>
                  <AnimatedNumber value={s.value} />
                </div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </Container>
      </div>
    </>
  );
}
