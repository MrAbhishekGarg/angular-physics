import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useMentorTests } from '../../hooks/useTests.js';
import { testService } from '../../services/testService.js';
import { formatPrice } from '../../data/courseFormat.js';
import formStyles from './DashboardForm.module.css';

export default function TestManager() {
  const { data: tests, loading, error, refetch } = useMentorTests();

  const handleDelete = async (test) => {
    if (!window.confirm(`Delete "${test.title}"? This also deletes all student attempts.`)) return;
    await testService.remove(test._id);
    await refetch();
  };

  return (
    <>
      <SEO title="Manage Tests" description="Create and manage test series for students." path="/dashboard/mentor/tests" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 1100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h1>Manage Tests</h1>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Button as={Link} to="/dashboard/mentor/worksheets" variant="ghost" size="sm">
                  Manage Worksheets
                </Button>
                <Button as={Link} to="/dashboard/mentor/tests/new" size="sm">
                  + New Test
                </Button>
              </div>
            </div>

            {loading && <Spinner label="Loading tests…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}

            {tests && tests.length === 0 && <ErrorState message="No tests yet." />}

            {(tests || []).map((test) => (
                <div key={test._id} className={formStyles.card}>
                  <div className={formStyles.cardHeader}>
                    <strong>{test.title}</strong>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <Badge tone={test.status === 'published' ? 'success' : 'default'}>{test.status}</Badge>
                      <Badge tone={test.isPaid ? 'accent' : 'success'}>
                        {test.isPaid ? formatPrice(test.price, test.currency) : 'Free'}
                      </Badge>
                      {test.liveUntil && (
                        <Badge tone={new Date(test.liveUntil) < new Date() ? 'accent' : 'highlight'}>
                          {new Date(test.liveUntil) < new Date() ? 'Expired' : `Live until ${new Date(test.liveUntil).toLocaleString()}`}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)' }}>
                    {test.examType} · {test.durationMinutes} min · {test.questionIds?.length ?? 0} questions ·{' '}
                    {(test.courseIds || []).map((c) => c.title || c).join(', ') || 'no courses assigned'}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button as={Link} to={`/dashboard/mentor/tests/${test._id}/edit`} size="sm" variant="ghost">
                      Edit
                    </Button>
                    <Button as={Link} to={`/dashboard/mentor/tests/${test._id}/results`} size="sm" variant="ghost">
                      Results
                    </Button>
                    {test.questionIds?.length > 0 && (
                      <>
                        <Button as="a" href={testService.answerPdfUrl(test._id)} target="_blank" rel="noopener noreferrer" size="sm" variant="secondary">
                          Preview Test
                        </Button>
                        <Button as="a" href={testService.pdfUrl(test._id)} target="_blank" rel="noopener noreferrer" size="sm" variant="ghost">
                          Download PDF
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="danger" onClick={() => handleDelete(test)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
        </div>
      </DashboardLayout>
    </>
  );
}
