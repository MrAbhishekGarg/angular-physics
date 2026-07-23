import Container from '../common/Container.jsx';
import SectionHeading from '../common/SectionHeading.jsx';
import Card from '../common/Card.jsx';
import Button from '../common/Button.jsx';
import styles from './FreeResources.module.css';

const RESOURCES = [
  {
    title: 'JEE Main Chapter-wise Physics Questions',
    description: 'Download a free chapter-wise question bank from JEE Main previous year papers.',
    href: '/resources/jee-main-chapter-wise-physics',
  },
  {
    title: 'NEET Physics Previous Year Papers',
    description: 'Free NEET Physics PYQs with detailed, step-by-step solutions.',
    href: '/resources/neet-physics-pyqs',
  },
  {
    title: 'Physics Formula Handbook',
    description: 'One PDF covering every formula from Class 11 & 12 Physics.',
    href: '/resources/physics-formula-handbook',
  },
];

export default function FreeResources() {
  return (
    <section className={styles.section} aria-labelledby="resources-heading">
      <Container>
        <SectionHeading
          eyebrow="Free Downloads"
          title="Study material, on the house"
          subtitle="No login required — start with these before enrolling in a full course."
        />
        <div className={styles.grid}>
          {RESOURCES.map((r) => (
            <Card key={r.title} className={styles.card}>
              <h3 className={styles.title}>{r.title}</h3>
              <p className={styles.desc}>{r.description}</p>
              <Button as="a" href={r.href} variant="ghost" size="sm">
                Download
              </Button>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
