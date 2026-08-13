import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useAllDoubts } from '../../hooks/useDoubts.js';
import { doubtService } from '../../services/doubtService.js';
import { assetUrl } from '../../data/assetUrl.js';
import formStyles from './DashboardForm.module.css';

const STATUS_TONE = { open: 'accent', answered: 'success', closed: 'default', cleared: 'highlight' };
const STATUS_FILTERS = ['all', 'open', 'answered', 'closed', 'cleared'];

export default function DoubtsManager() {
  const [statusFilter, setStatusFilter] = useState('open');
  const { data: doubts, loading, error, refetch } = useAllDoubts(statusFilter === 'all' ? undefined : statusFilter);
  const [respondingId, setRespondingId] = useState(null);

  return (
    <>
      <SEO title="Doubts" description="Answer student doubts." path="/dashboard/mentor/doubts" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <h1>Doubts</h1>

            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: 'var(--ap-space-sm)', flexWrap: 'wrap' }}>
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  style={{
                    border: '1px solid var(--ap-border)',
                    clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                    padding: '0.25rem 0.7rem',
                    fontSize: '0.8rem',
                    background: statusFilter === s ? 'var(--ap-primary-surface)' : 'transparent',
                    color: statusFilter === s ? '#fff' : 'var(--ap-text)',
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {loading && <Spinner label="Loading doubts…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}
            {doubts && doubts.length === 0 && <ErrorState message="No doubts in this category." />}

            {(doubts || []).map((d) => (
              <div key={d._id} className={formStyles.card}>
                <div className={formStyles.cardHeader}>
                  <strong>
                    {d.studentId?.name} {d.courseId ? `· ${d.courseId.title}` : ''} {d.worksheetId ? `· 📄 ${d.worksheetId.title}` : ''}
                  </strong>
                  <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>{d.studentId?.email}</p>
                {d.questionText && <p>{d.questionText}</p>}
                {d.questionImageUrl && (
                  <img src={assetUrl(d.questionImageUrl)} alt="" style={{ maxWidth: 280, borderRadius: 6, marginBottom: '0.5rem' }} />
                )}

                {d.status !== 'open' && (
                  <div style={{ background: 'var(--ap-bg-muted)', borderRadius: 8, padding: '0.6rem', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem' }}>Your answer</strong>
                    {d.answerText && <p style={{ margin: '0.3rem 0' }}>{d.answerText}</p>}
                    {d.answerImageUrl && <img src={assetUrl(d.answerImageUrl)} alt="" style={{ maxWidth: 280, borderRadius: 6 }} />}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {d.status !== 'closed' && (
                    <Button size="sm" variant="ghost" onClick={() => setRespondingId(respondingId === d._id ? null : d._id)}>
                      {d.status === 'answered' ? 'Update answer' : 'Answer'}
                    </Button>
                  )}
                  {d.status === 'answered' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await doubtService.close(d._id);
                        refetch();
                      }}
                    >
                      Close
                    </Button>
                  )}
                </div>

                {respondingId === d._id && <AnswerForm doubt={d} onDone={() => { setRespondingId(null); refetch(); }} />}
              </div>
            ))}
        </div>
      </DashboardLayout>
    </>
  );
}

function AnswerForm({ doubt, onDone }) {
  const [answerText, setAnswerText] = useState(doubt.answerText || '');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answerText.trim() && !file && !doubt.answerImageUrl) {
      setError('Type an answer or attach an image before submitting.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      let answerImageUrl = doubt.answerImageUrl;
      if (file) {
        const res = await doubtService.uploadImage(file);
        answerImageUrl = res.imageUrl;
      }
      await doubtService.answer(doubt._id, { answerText, answerImageUrl });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={formStyles.form} onSubmit={handleSubmit} style={{ marginTop: '0.5rem' }}>
      <label>
        Answer
        <textarea rows="3" value={answerText} onChange={(e) => setAnswerText(e.target.value)} />
      </label>
      <label>
        Attach an image (optional)
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files[0])} />
      </label>
      <div className={formStyles.actions}>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? 'Saving…' : 'Submit Answer'}
        </Button>
      </div>
      {error && <p className={formStyles.errorMsg}>{error}</p>}
    </form>
  );
}
