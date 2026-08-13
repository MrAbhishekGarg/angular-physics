import { Link } from 'react-router-dom';
import Container from '../common/Container.jsx';
import Button from '../common/Button.jsx';
import AnimatedNumber from '../common/AnimatedNumber.jsx';
import { useAuth, isMentorRole } from '../../hooks/useAuth.js';
import styles from './Hero.module.css';

const STATS = [
  { value: '200+', label: 'Double-digit AIRs mentored', accent: true },
  { value: '4,800+', label: 'Students taught' },
  { value: '3', label: 'Tracks — JEE, NEET, Olympiad' },
];

export default function Hero() {
  const { user } = useAuth();
  const loginCtaTarget = user ? (isMentorRole(user.role) ? '/dashboard/mentor' : '/dashboard/student') : '/login';

  return (
    <>
      <section className={styles.hero} id="hero">
        <Container className={styles.inner}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true">&#8736;</span> #PhysicsBoleTohAngularPhysics
            </p>
            <h1 className={styles.headline}>
              Find your <span className={styles.accent}>angle</span> to every Physics answer.
            </h1>
            <p className={styles.tagline}>
              Where <strong className={styles.taglineAccent}>Concepts</strong> Meet{' '}
              <strong className={styles.taglineAccent}>Clarity</strong>
            </p>
            <p className={styles.subhead}>
              Physics-only courses for JEE Main &amp; Advanced, NEET, and Physics Olympiads —
              mentored entirely by <strong>Abhishek Garg</strong>, producer of double-digit
              All India Ranks.
            </p>
            <div className={styles.ctas}>
              <Button as={Link} to="/courses" size="lg">
                View Courses
              </Button>
              <Button as={Link} to={loginCtaTarget} variant="ghostInverse" size="lg">
                {user ? 'Go to Dashboard' : 'Login to Courses'}
              </Button>
            </div>
          </div>

          <div className={styles.visual} aria-hidden="true">
            <svg viewBox="0 0 320 280" className={styles.vectorArt}>
              {/* Two open polylines, not a closed shape — SVG paths default
                  to a black fill when none is given, which was silently
                  filling the whole triangle solid black instead of reading
                  as line art. */}
              <path d="M40 240 L160 40 L280 240" fill="none" stroke="#3fd1e6" strokeWidth="2.5" strokeDasharray="6 6" opacity="0.6" />
              <path d="M40 240 L280 240" fill="none" stroke="#ff6b4a" strokeWidth="2.5" />
              {/* Arc from a point on the baseline to a point on the sloped
                  edge, both at the same 20px radius from the vertex, so it
                  traces the actual angle instead of an arbitrary curve. */}
              <path d="M60 240 A 20 20 0 0 0 50.3 222.9" stroke="#fff" strokeWidth="2" opacity="0.7" fill="none" />
              <circle cx="160" cy="40" r="7" fill="#17b8cf" />
              <circle cx="40" cy="240" r="5" fill="#fff" />
              <circle cx="280" cy="240" r="5" fill="#ff6b4a" />
              <text x="66" y="222" fill="#c9d6e8" fontSize="13" fontFamily="ui-monospace, monospace">
                &#952;
              </text>
            </svg>
          </div>
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
