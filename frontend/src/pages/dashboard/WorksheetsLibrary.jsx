import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useAvailableWorksheets } from '../../hooks/useWorksheets.js';
import { worksheetService } from '../../services/worksheetService.js';
import formStyles from './DashboardForm.module.css';

const STATUS_TONE = { 'not downloaded': 'default', downloaded: 'accent', completed: 'success' };

function statusOf(w) {
  if (w.myProgress?.completedAt) return 'completed';
  if (w.myProgress?.downloadedAt) return 'downloaded';
  return 'not downloaded';
}

function isExpired(w) {
  return Boolean(w.deadlineAt) && new Date(w.deadlineAt) < new Date();
}

export default function WorksheetsLibrary() {
  const { data: worksheets, loading, error, refetch } = useAvailableWorksheets();
  const [completingId, setCompletingId] = useState(null);

  const handleDownload = (worksheet) => {
    window.open(worksheetService.downloadUrl(worksheet._id), '_blank', 'noopener');
    setTimeout(refetch, 800);
  };

  const handleComplete = async (worksheet) => {
    if (!window.confirm(`Mark "${worksheet.title}" as completed? This can't be undone.`)) return;
    setCompletingId(worksheet._id);
    try {
      await worksheetService.complete(worksheet._id);
      await refetch();
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <>
      <SEO title="DPPs & Assignments" description="Download DPP and Assignment PDFs for your enrolled courses." path="/dashboard/student/worksheets" />
      <DashboardLayout role="student">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <h1>DPPs & Assignments</h1>
          <p style={{ color: 'var(--ap-text-muted)' }}>
            Daily Practice Problems and Assignments are downloadable PDFs — not online tests.
          </p>

          {loading && <Spinner label="Loading worksheets…" />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {worksheets && worksheets.length === 0 && (
            <ErrorState message="No DPPs or Assignments have been assigned to your courses yet." />
          )}

          {(worksheets || []).map((w) => {
            const status = statusOf(w);
            const expired = isExpired(w);
            return (
              <div key={w._id} className={formStyles.card}>
                <div className={formStyles.cardHeader}>
                  <strong>{w.title}</strong>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <Badge tone={w.type === 'dpp' ? 'accent' : 'launching'}>{w.type === 'dpp' ? 'DPP' : 'Assignment'}</Badge>
                    <Badge tone={STATUS_TONE[status]}>{status}</Badge>
                    {w.deadlineAt && (
                      <Badge tone={expired ? 'accent' : 'highlight'}>
                        {expired ? 'Deadline passed' : `Due ${new Date(w.deadlineAt).toLocaleString()}`}
                      </Badge>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>
                  {w.examType || ''} {w.chapter ? `· ${w.chapter}` : ''}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button size="sm" disabled={expired} onClick={() => handleDownload(w)}>
                    {expired ? 'Download closed' : 'Download PDF'}
                  </Button>
                  {status !== 'completed' && w.myProgress?.downloadedAt && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={expired || completingId === w._id}
                      onClick={() => handleComplete(w)}
                    >
                      {completingId === w._id ? 'Saving…' : 'Mark as Completed'}
                    </Button>
                  )}
                  <Button
                    as={Link}
                    to={`/dashboard/student/doubts?worksheetId=${w._id}&title=${encodeURIComponent(w.title)}`}
                    size="sm"
                    variant="ghost"
                  >
                    Ask Doubt
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DashboardLayout>
    </>
  );
}
