import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import { useMyTestAttempts } from '../../hooks/useTests.js';
import formStyles from './DashboardForm.module.css';

export default function TestHistory() {
  const { data: attempts, loading, error, refetch } = useMyTestAttempts();

  return (
    <>
      <SEO title="My Test Results" description="Your past test attempts and scores." path="/dashboard/student/tests/history" />
      <DashboardLayout role="student">
        <div className={formStyles.wrap} style={{ maxWidth: 960 }}>
          <h1>My Test Results</h1>

            {loading && <Spinner label="Loading results…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}
            {attempts && attempts.length === 0 && <ErrorState message="You haven't attempted any tests yet." />}

            {(attempts || []).map((a) => (
              <div key={a._id} className={formStyles.card}>
                <div className={formStyles.cardHeader}>
                  <strong>{a.testId?.title}</strong>
                  <Badge tone={a.status === 'submitted' ? 'success' : 'highlight'}>{a.status}</Badge>
                </div>
                {a.status === 'submitted' ? (
                  <Button as={Link} to={`/dashboard/student/tests/attempts/${a._id}/result`} size="sm" variant="secondary">
                    Score: {a.score} / {a.maxScore} — View Details
                  </Button>
                ) : (
                  <Button as={Link} to={`/dashboard/student/tests/${a.testId?._id}`} size="sm">
                    Resume Test
                  </Button>
                )}
              </div>
            ))}
        </div>
      </DashboardLayout>
    </>
  );
}
