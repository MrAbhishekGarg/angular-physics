import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useMyDoubts } from '../../hooks/useDoubts.js';
import { useMyEnrollments } from '../../hooks/useEnrollments.js';
import { doubtService } from '../../services/doubtService.js';
import { assetUrl } from '../../data/assetUrl.js';
import formStyles from './DashboardForm.module.css';

const STATUS_TONE = { open: 'accent', answered: 'success', closed: 'default', cleared: 'highlight' };

export default function DoubtsPanel() {
  const { data: doubts, loading, error, refetch } = useMyDoubts();
  const { data: enrollments } = useMyEnrollments();
  const [searchParams] = useSearchParams();
  const worksheetId = searchParams.get('worksheetId') || '';
  const worksheetTitle = searchParams.get('title') || '';

  const [form, setForm] = useState({
    courseId: '',
    questionText: worksheetTitle ? `Doubt about worksheet: ${worksheetTitle}\n\n` : '',
  });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionId, setActionId] = useState(null);

  const handleMarkUnderstood = async (doubt) => {
    setActionId(doubt._id);
    try {
      await doubtService.markCleared(doubt._id);
      await refetch();
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteDoubt = async (doubt) => {
    if (!window.confirm('Delete this doubt? This cannot be undone.')) return;
    setActionId(doubt._id);
    try {
      await doubtService.remove(doubt._id);
      await refetch();
    } finally {
      setActionId(null);
    }
  };

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.questionText.trim() && !file) {
      setFormError('Type your doubt or attach an image before posting.');
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      let questionImageUrl;
      if (file) {
        const { imageUrl } = await doubtService.uploadImage(file);
        questionImageUrl = imageUrl;
      }
      await doubtService.create({
        courseId: form.courseId || undefined,
        worksheetId: worksheetId || undefined,
        questionText: form.questionText,
        questionImageUrl,
      });
      setForm({ courseId: '', questionText: '' });
      setFile(null);
      await refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SEO title="Ask a Doubt" description="Post a doubt for your mentor to answer." path="/dashboard/student/doubts" />
      <DashboardLayout role="student">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <h1>Doubts</h1>

            <h2 style={{ color: 'var(--ap-primary)', marginBottom: 'var(--ap-space-sm)' }}>Ask a Doubt</h2>
            {worksheetTitle && (
              <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)' }}>
                📄 This doubt will be linked to <strong>{worksheetTitle}</strong>
              </p>
            )}
            <form className={formStyles.form} onSubmit={handleSubmit}>
              {enrollments && enrollments.length > 0 && (
                <label>
                  Course (optional)
                  <select name="courseId" value={form.courseId} onChange={handleChange}>
                    <option value="">General</option>
                    {enrollments.map((e) => (
                      <option key={e._id} value={e.courseId?._id}>
                        {e.courseId?.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Your doubt
                <textarea
                  name="questionText"
                  rows="3"
                  value={form.questionText}
                  onChange={handleChange}
                  placeholder="Type your question, or just attach a photo below"
                />
              </label>
              <label>
                Attach an image (optional)
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files[0])} />
              </label>
              <div className={formStyles.actions}>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Posting…' : 'Post Doubt'}
                </Button>
              </div>
              {formError && <p className={formStyles.errorMsg}>{formError}</p>}
            </form>

            <h2 style={{ color: 'var(--ap-primary)', margin: 'var(--ap-space-lg) 0 var(--ap-space-sm)' }}>Your Doubts</h2>
            {loading && <Spinner label="Loading doubts…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}
            {doubts && doubts.length === 0 && <ErrorState message="You haven't posted any doubts yet." />}

            {(doubts || []).map((d) => (
              <div key={d._id} className={formStyles.card}>
                <div className={formStyles.cardHeader}>
                  <strong>{new Date(d.createdAt).toLocaleDateString()}</strong>
                  <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>
                </div>
                {d.questionText && <p>{d.questionText}</p>}
                {d.questionImageUrl && (
                  <img src={assetUrl(d.questionImageUrl)} alt="" style={{ maxWidth: 240, borderRadius: 6, marginBottom: '0.5rem' }} />
                )}
                {d.status !== 'open' && (
                  <div style={{ background: 'var(--ap-bg-muted)', borderRadius: 8, padding: '0.6rem', marginTop: '0.4rem' }}>
                    <strong style={{ fontSize: '0.85rem' }}>Mentor's answer</strong>
                    {d.answerText && <p style={{ margin: '0.3rem 0' }}>{d.answerText}</p>}
                    {d.answerImageUrl && (
                      <img src={assetUrl(d.answerImageUrl)} alt="" style={{ maxWidth: 240, borderRadius: 6 }} />
                    )}
                  </div>
                )}
                {(d.status === 'answered' || d.status === 'open') && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {d.status === 'answered' && (
                      <Button size="sm" disabled={actionId === d._id} onClick={() => handleMarkUnderstood(d)}>
                        {actionId === d._id ? 'Saving…' : 'Mark Understood'}
                      </Button>
                    )}
                    {d.status === 'open' && (
                      <Button size="sm" variant="ghost" disabled={actionId === d._id} onClick={() => handleDeleteDoubt(d)}>
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      </DashboardLayout>
    </>
  );
}
