import { Link } from 'react-router-dom';
import Card from '../common/Card.jsx';
import Spinner from '../common/Spinner.jsx';
import { useRecommendations } from '../../hooks/useRecommendations.js';
import { formatPrice } from '../../data/courseFormat.js';

/**
 * Rule-based (no external AI call) — see recommendation.service.js on the
 * backend. Suggests a next course, unpurchased notes, and an unattempted
 * test based on the student's own enrollment/purchase/attempt history.
 */
export default function RecommendationPanel() {
  const { data, loading } = useRecommendations();

  if (loading) return <Spinner label="Finding recommendations…" />;
  if (!data) return null;

  const hasAny = data.suggestedCourses.length || data.suggestedNotes.length || data.suggestedTests.length;
  if (!hasAny) return null;

  return (
    <Card style={{ padding: 'var(--ap-space-md)', marginBottom: 'var(--ap-space-lg)' }}>
      <h2 style={{ color: 'var(--ap-primary)', marginBottom: '0.4rem' }}>What's Next For You</h2>
      <p style={{ color: 'var(--ap-text-muted)', marginBottom: 'var(--ap-space-sm)' }}>{data.message}</p>

      {data.suggestedCourses.length > 0 && (
        <div style={{ marginBottom: 'var(--ap-space-sm)' }}>
          <strong style={{ fontSize: '0.85rem' }}>Courses</strong>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
            {data.suggestedCourses.map((c) => (
              <li key={c._id}>
                <Link to={`/courses/${c.slug}`}>{c.title}</Link> — {formatPrice(c.price, c.currency)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.suggestedNotes.length > 0 && (
        <div style={{ marginBottom: 'var(--ap-space-sm)' }}>
          <strong style={{ fontSize: '0.85rem' }}>Notes</strong>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
            {data.suggestedNotes.map((n) => (
              <li key={n._id}>
                <Link to="/dashboard/student/notes">{n.title}</Link>{' '}
                {n.category === 'premium' ? `(buy for ${formatPrice(n.price, n.currency)})` : '(free)'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.suggestedTests.length > 0 && (
        <div>
          <strong style={{ fontSize: '0.85rem' }}>Tests</strong>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
            {data.suggestedTests.map((t) => (
              <li key={t._id}>
                <Link to="/dashboard/student/tests">{t.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
