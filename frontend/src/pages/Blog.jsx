import { Link } from 'react-router-dom';
import SEO from '../components/seo/SEO.jsx';
import Container from '../components/common/Container.jsx';
import SectionHeading from '../components/common/SectionHeading.jsx';
import Card from '../components/common/Card.jsx';
import Spinner from '../components/common/Spinner.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import { usePublishedArticles } from '../hooks/useArticles.js';
import styles from '../components/home/FreeResources.module.css';

export default function Blog() {
  const { data: articles, loading, error, refetch } = usePublishedArticles();

  return (
    <>
      <SEO title="Blog" description="Physics prep strategy, exam updates, and study tips from Angular Physics." path="/blog" />
      <main>
        <Container>
          <div style={{ paddingTop: 'var(--ap-space-xl)' }}>
            <SectionHeading align="left" eyebrow="Blog" title="Articles & Updates" />

            {loading && <Spinner label="Loading articles…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}
            {articles && articles.length === 0 && <ErrorState message="No articles published yet — check back soon." />}

            {articles && articles.length > 0 && (
              <div className={styles.grid}>
                {articles.map((a) => (
                  <Card key={a._id} className={styles.card}>
                    <h3 className={styles.title}>{a.title}</h3>
                    <p className={styles.desc}>{a.excerpt}</p>
                    <Link to={`/blog/${a.slug}`}>Read More →</Link>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Container>
      </main>
    </>
  );
}
