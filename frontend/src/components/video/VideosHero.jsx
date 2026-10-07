import Container from '../common/Container.jsx';
import styles from './VideosHero.module.css';

export default function VideosHero({ count }) {
  return (
    <section className={styles.hero}>
      <Container className={styles.inner}>
        <p className={styles.eyebrow}>
          <span aria-hidden="true">&#9654;</span> Angular Physics on YouTube
        </p>
        <h1 className={styles.headline}>
          Free Physics lessons, <span className={styles.accent}>every week</span>
        </h1>
        <p className={styles.subhead}>
          {count != null ? `${count} videos ` : 'Videos '}covering concepts, problem-solving and exam strategy —
          organized into playlists so you can binge an entire topic at once.
        </p>
      </Container>
    </section>
  );
}
