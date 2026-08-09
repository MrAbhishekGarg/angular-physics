import { Link } from 'react-router-dom';
import Container from '../common/Container.jsx';
import SectionHeading from '../common/SectionHeading.jsx';
import Card from '../common/Card.jsx';
import Button from '../common/Button.jsx';
import { usePublishedArticles } from '../../hooks/useArticles.js';
import styles from './FreeResources.module.css';

export default function BlogPreview() {
  const { data: articles } = usePublishedArticles();

  if (!articles || articles.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="blog-heading">
      <Container>
        <SectionHeading eyebrow="From the Blog" title="Articles worth your time" subtitle="Physics prep strategy, exam updates, and study tips." />
        <div className={styles.grid}>
          {articles.slice(0, 3).map((a) => (
            <Card key={a._id} className={styles.card}>
              <h3 className={styles.title}>{a.title}</h3>
              <p className={styles.desc}>{a.excerpt}</p>
              <Button as={Link} to={`/blog/${a.slug}`} variant="ghost" size="sm">
                Read More
              </Button>
            </Card>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 'var(--ap-space-md)' }}>
          <Link to="/blog">View all articles →</Link>
        </div>
      </Container>
    </section>
  );
}
