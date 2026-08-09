import { useParams, Link } from 'react-router-dom';
import SEO from '../components/seo/SEO.jsx';
import Container from '../components/common/Container.jsx';
import Spinner from '../components/common/Spinner.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import { useArticleBySlug } from '../hooks/useArticles.js';
import { assetUrl } from '../data/assetUrl.js';

export default function ArticleDetail() {
  const { slug } = useParams();
  const { data: article, loading, error, refetch } = useArticleBySlug(slug);

  if (loading) return <Spinner label="Loading article…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!article) return null;

  return (
    <>
      <SEO title={article.title} description={article.excerpt} path={`/blog/${article.slug}`} />
      <main>
        <Container>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--ap-space-xl) 0' }}>
            <Link to="/blog">← Back to Blog</Link>
            <h1 style={{ marginTop: 'var(--ap-space-sm)' }}>{article.title}</h1>
            <p style={{ color: 'var(--ap-text-muted)', fontSize: '0.85rem' }}>
              {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}
            </p>

            {article.coverImageUrl && (
              <img
                src={assetUrl(article.coverImageUrl)}
                alt={article.title}
                style={{ width: '100%', borderRadius: 10, margin: 'var(--ap-space-md) 0' }}
              />
            )}

            {article.body.split(/\n\s*\n/).map((paragraph, i) => (
              <p key={i} style={{ marginBottom: 'var(--ap-space-sm)', lineHeight: 1.7 }}>
                {paragraph}
              </p>
            ))}
          </div>
        </Container>
      </main>
    </>
  );
}
