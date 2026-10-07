import { Link } from 'react-router-dom';
import SEO from '../components/seo/SEO.jsx';
import Container from '../components/common/Container.jsx';
import Spinner from '../components/common/Spinner.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import { usePublishedArticles } from '../hooks/useArticles.js';
import { assetUrl } from '../data/assetUrl.js';
import { readingTime } from '../data/readingTime.js';
import styles from './Blog.module.css';

function formatDate(article) {
  return new Date(article.publishedAt || article.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function Blog() {
  const { data: articles, loading, error, refetch } = usePublishedArticles();
  const [featured, ...rest] = articles || [];

  return (
    <>
      <SEO title="Blog" description="Physics prep strategy, exam updates, and study tips from Angular Physics." path="/blog" />
      <main>
        <section className={styles.hero}>
          <Container className={styles.heroInner}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true">&#9998;</span> From the Mentor's Desk
            </p>
            <h1 className={styles.headline}>
              Prep strategy, <span className={styles.accent}>straight talk</span>
            </h1>
            <p className={styles.subhead}>Exam updates, study tips, and physics insight — written by Abhishek Garg.</p>
          </Container>
        </section>

        <Container>
          <div className={styles.body}>
            {loading && <Spinner label="Loading articles…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}
            {articles && articles.length === 0 && <ErrorState message="No articles published yet — check back soon." />}

            {featured && (
              <Link to={`/blog/${featured.slug}`} className={styles.featured}>
                <div className={styles.featuredImageWrap}>
                  {featured.coverImageUrl ? (
                    <img src={assetUrl(featured.coverImageUrl)} alt="" className={styles.featuredImage} />
                  ) : (
                    <div className={styles.featuredImageFallback} aria-hidden="true">
                      &#8736;
                    </div>
                  )}
                </div>
                <div className={styles.featuredBody}>
                  <span className={styles.featuredTag}>Latest</span>
                  <h2 className={styles.featuredTitle}>{featured.title}</h2>
                  <p className={styles.featuredDesc}>{featured.excerpt}</p>
                  <p className={styles.meta}>
                    {formatDate(featured)} · {readingTime(featured.body)} min read
                  </p>
                </div>
              </Link>
            )}

            {rest.length > 0 && (
              <div className={styles.grid}>
                {rest.map((a) => (
                  <Link key={a._id} to={`/blog/${a.slug}`} className={styles.card}>
                    <div className={styles.imageWrap}>
                      {a.coverImageUrl ? (
                        <img src={assetUrl(a.coverImageUrl)} alt="" className={styles.image} />
                      ) : (
                        <div className={styles.imageFallback} aria-hidden="true">
                          &#8736;
                        </div>
                      )}
                    </div>
                    <div className={styles.cardBody}>
                      <h3 className={styles.title}>{a.title}</h3>
                      <p className={styles.desc}>{a.excerpt}</p>
                      <p className={styles.meta}>
                        {formatDate(a)} · {readingTime(a.body)} min read
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Container>
      </main>
    </>
  );
}
