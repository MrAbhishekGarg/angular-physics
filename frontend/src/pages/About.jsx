import SEO from '../components/seo/SEO.jsx';
import Container from '../components/common/Container.jsx';
import styles from './StaticPage.module.css';

export default function About() {
  return (
    <>
      <SEO
        title="About Angular Physics"
        description="Angular Physics is a physics-only learning platform for IIT-JEE, NEET and Olympiad aspirants, built around a single mentor: Abhishek Kumar Garg."
        path="/about"
      />
      <main>
        <Container>
          <div className={styles.wrap}>
            <h1>About Angular Physics</h1>
            <p>
              Angular Physics exists for one reason: Physics is a subject of angles, vectors and
              intuition — and most students never get taught it that way. We built a platform
              entirely around Physics, and entirely around one mentor, Abhishek Kumar Garg, so
              every student gets the same depth of teaching whether they're preparing for JEE
              Main, JEE Advanced, NEET, or a Physics Olympiad.
            </p>
            <p>
              No generalist faculty, no diluted syllabus — just Physics, taught by someone who has
              spent over a decade turning it into students' strongest subject.
            </p>
          </div>
        </Container>
      </main>
    </>
  );
}
