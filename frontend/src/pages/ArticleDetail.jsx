import { useParams, Link } from 'react-router-dom';
import SEO from '../components/seo/SEO.jsx';
import JsonLd, { articleSchema } from '../components/seo/JsonLd.jsx';
import Container from '../components/common/Container.jsx';
import Spinner from '../components/common/Spinner.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import WhatsAppButton from '../components/common/WhatsAppButton.jsx';
import { useArticleBySlug } from '../hooks/useArticles.js';
import { assetUrl } from '../data/assetUrl.js';
import { readingTime } from '../data/readingTime.js';
import styles from './ArticleDetail.module.css';

export default function ArticleDetail() {
  const { slug } = useParams();
  const { data: article, loading, error, refetch } = useArticleBySlug(slug);

  if (loading) return <Spinner label="Loading article…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!article) return null;

  return (
    <>
      <SEO title={article.title} description={article.excerpt} path={`/blog/${article.slug}`} />
      <JsonLd schema={articleSchema(article)} />
      <main>
        <Container>
          <article className={styles.wrap}>
            <Link to="/blog" className={styles.back}>
              ← Back to Blog
            </Link>

            <h1 className={styles.title}>{article.title}</h1>
            <p className={styles.meta}>
              {new Date(article.publishedAt || article.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {' · '}
              {readingTime(article.body)} min read
            </p>

            {article.coverImageUrl && (
              <img src={assetUrl(article.coverImageUrl)} alt={article.title} className={styles.cover} />
            )}

            <div className={styles.content}>
              {article.body.split(/\n\s*\n/).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            <div className={styles.ctaBanner}>
              <div>
                <h3 className={styles.ctaTitle}>Have questions about this topic?</h3>
                <p className={styles.ctaText}>Reach out directly and we'll help you figure out the right course.</p>
              </div>
              <WhatsAppButton message={`Hi! I read your article "${article.title}" and had a question.`}>
                Ask on WhatsApp
              </WhatsAppButton>
            </div>
          </article>
        </Container>
      </main>
    </>
  );
}
