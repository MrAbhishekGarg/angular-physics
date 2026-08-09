import { Link } from 'react-router-dom';
import { useState } from 'react';
import { usePublishedArticles } from '../../hooks/useArticles.js';
import styles from './LatestBlogWidget.module.css';

/**
 * Floating quick-access to the latest blog posts — mirrors
 * CourseFinderWidget's launcher/backdrop/panel pattern, positioned
 * bottom-left so it doesn't collide with the "Find My Course" button.
 * Stays hidden until at least one article is published.
 */
export default function LatestBlogWidget() {
  const { data: articles } = usePublishedArticles();
  const [open, setOpen] = useState(false);

  if (!articles || articles.length === 0) return null;

  const latest = articles.slice(0, 3);

  return (
    <>
      <button type="button" className={styles.launcher} onClick={() => setOpen(true)}>
        📰 Latest Blog
      </button>

      {open && (
        <div className={styles.backdrop} onClick={() => setOpen(false)}>
          <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.panelHeader}>
              <strong>From the Blog</strong>
              <button type="button" className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>

            {latest.map((a) => (
              <div key={a._id} className={styles.postCard}>
                <strong>{a.title}</strong>
                <p className={styles.excerpt}>{a.excerpt}</p>
                <Link to={`/blog/${a.slug}`} onClick={() => setOpen(false)}>
                  Read More →
                </Link>
              </div>
            ))}

            <Link to="/blog" className={styles.viewAll} onClick={() => setOpen(false)}>
              View all articles →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
