import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useAvailableTests } from '../../hooks/useTests.js';
import { testService } from '../../services/testService.js';
import { paymentService } from '../../services/paymentService.js';
import { useAuth } from '../../hooks/useAuth.js';
import { formatPrice } from '../../data/courseFormat.js';
import formStyles from './DashboardForm.module.css';

export default function TestsLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: tests, loading, error, refetch } = useAvailableTests();
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const handleStart = async (test) => {
    navigate(`/dashboard/student/tests/${test._id}`);
  };

  const handleBuyAndStart = async (test) => {
    setBusyId(test._id);
    setActionError('');
    try {
      await paymentService.purchase({
        itemType: 'test',
        itemId: test._id,
        itemName: test.title,
        studentName: user?.name,
        studentEmail: user?.email,
      });
      await refetch();
      navigate(`/dashboard/student/tests/${test._id}`);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <SEO title="Tests" description="Take free or paid tests for your enrolled courses." path="/dashboard/student/tests" />
      <DashboardLayout role="student">
        <div className={formStyles.wrap} style={{ maxWidth: 960 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h1>Tests</h1>
            <Button as={Link} to="/dashboard/student/tests/history" variant="ghost" size="sm">
              My Results
            </Button>
          </div>

            {loading && <Spinner label="Loading tests…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}
            {actionError && <p className={formStyles.errorMsg}>{actionError}</p>}

            {tests && tests.length === 0 && (
              <ErrorState message="No tests available yet." />
            )}

            {(tests || []).map((test) => {
              const alreadyAttempted = test.myAttempt?.status === 'submitted';
              const canResume = test.myAttempt?.status === 'in-progress';
              const needsPurchase = test.isPaid && !alreadyAttempted && !canResume;

              return (
                <div key={test._id} className={formStyles.card}>
                  <div className={formStyles.cardHeader}>
                    <strong>{test.title}</strong>
                    <Badge tone={test.isPaid ? 'accent' : 'success'}>
                      {test.isPaid ? formatPrice(test.price, test.currency) : 'Free'}
                    </Badge>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)' }}>
                    {test.examType} · {test.durationMinutes} minutes
                  </p>

                  {alreadyAttempted ? (
                    <Button
                      as={Link}
                      to={`/dashboard/student/tests/attempts/${test.myAttempt._id ?? test.myAttempt}/result`}
                      size="sm"
                      variant="secondary"
                    >
                      View Result: {test.myAttempt.score} / {test.myAttempt.maxScore}
                    </Button>
                  ) : needsPurchase ? (
                    <Button size="sm" disabled={busyId === test._id} onClick={() => handleBuyAndStart(test)}>
                      {busyId === test._id ? 'Processing…' : `Buy & Start`}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => handleStart(test)}>
                      {canResume ? 'Resume Test' : 'Start Test'}
                    </Button>
                  )}
                </div>
              );
            })}
        </div>
      </DashboardLayout>
    </>
  );
}
