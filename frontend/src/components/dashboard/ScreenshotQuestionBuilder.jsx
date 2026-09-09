import { useEffect, useState } from 'react';
import Button from '../common/Button.jsx';
import Badge from '../common/Badge.jsx';
import QuestionEditor from './QuestionEditor.jsx';
import { questionService } from '../../services/questionService.js';
import { assetUrl } from '../../data/assetUrl.js';
import formStyles from '../../pages/dashboard/DashboardForm.module.css';

const STORAGE_KEY = 'ap-staged-screenshot-questions';
const TYPE_LABELS = {
  'mcq-single': 'Single-answer MCQ',
  'mcq-multiple': 'Multi-answer MCQ',
  numerical: 'Numerical answer',
};

function loadStaged() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Carries a just-staged question's taxonomy forward as the next question's
// starting point (chapter/topic/exam type/marks rarely change question to
// question within one worksheet) while resetting anything content-specific
// — a mentor working through a whole chapter shouldn't have to retype the
// same chapter/topic/exam-type for every single question.
function seedFrom(question) {
  return {
    type: question.type,
    text: '',
    imageUrl: undefined,
    options: (question.options || []).map(() => ({ text: '', imageUrl: undefined })),
    correctOptionIndexes: [],
    correctNumericAnswer: undefined,
    numericTolerance: 0,
    marks: question.marks,
    negativeMarks: question.negativeMarks,
    examTypes: question.examTypes || [],
    subject: question.subject || '',
    chapter: question.chapter || '',
    topic: question.topic || '',
    difficulty: question.difficulty || 'medium',
    isPYQ: question.isPYQ || false,
    pyqYear: question.pyqYear || '',
    author: question.author || '',
    tags: [],
    conceptCodes: [],
  };
}

/**
 * Lets a mentor build up several questions one at a time — paste screenshots
 * for the stem/options via the same QuestionEditor form used everywhere else
 * (in staging mode via its `onStage` prop, so nothing saves to the bank yet)
 * — then review the whole batch, with correct answers marked, before a
 * single "upload all" commit. Staged questions persist to localStorage so an
 * accidental refresh mid-batch doesn't lose careful work; the pasted images
 * themselves are already safely on the server the moment they're pasted.
 */
export default function ScreenshotQuestionBuilder({ examType, onUploaded }) {
  const [stagedQuestions, setStagedQuestions] = useState(loadStaged);
  const [seed, setSeed] = useState(() => {
    const staged = loadStaged();
    return staged.length ? seedFrom(staged[staged.length - 1]) : undefined;
  });
  const [mode, setMode] = useState('build');
  const [committing, setCommitting] = useState(false);
  const [commitSummary, setCommitSummary] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stagedQuestions));
    } catch {
      // Staging still works purely in-memory for this session even if
      // persistence fails (private browsing, storage quota, etc).
    }
  }, [stagedQuestions]);

  const handleStage = (payload) => {
    setStagedQuestions((prev) => [...prev, { localId: crypto.randomUUID(), ...payload }]);
    setSeed(seedFrom(payload));
  };

  const handleRemove = (localId) => setStagedQuestions((prev) => prev.filter((q) => q.localId !== localId));

  const handleCommit = async () => {
    setCommitting(true);
    setCommitSummary('');
    const results = await Promise.allSettled(
      stagedQuestions.map(({ localId, _error, ...payload }) => questionService.create(payload))
    );

    const succeededIds = new Set();
    const failureById = new Map();
    results.forEach((result, i) => {
      const { localId } = stagedQuestions[i];
      if (result.status === 'fulfilled') succeededIds.add(localId);
      else failureById.set(localId, result.reason?.message || 'Upload failed');
    });

    setStagedQuestions((prev) =>
      prev
        .filter((q) => !succeededIds.has(q.localId))
        .map((q) => (failureById.has(q.localId) ? { ...q, _error: failureById.get(q.localId) } : q))
    );
    setCommitting(false);

    const failedCount = results.length - succeededIds.size;
    if (succeededIds.size === 0) {
      setCommitSummary(`Upload failed for all ${results.length} question${results.length === 1 ? '' : 's'} — see errors below.`);
    } else {
      setCommitSummary(
        `Uploaded ${succeededIds.size} of ${results.length} question${results.length === 1 ? '' : 's'}.` +
          (failedCount > 0 ? ` ${failedCount} failed — fix and retry below.` : '')
      );
      onUploaded?.();
    }
    if (failedCount === 0) setMode('build');
  };

  return (
    <div className={formStyles.card}>
      <strong>Screenshot Question Builder</strong>
      <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)', margin: '0.3rem 0' }}>
        Build questions one at a time — paste a screenshot for the stem and each option below and see it previewed
        immediately, just like the manual editor. Nothing saves to the bank until you review the whole batch and
        confirm.
      </p>

      {mode === 'build' ? (
        <>
          <QuestionEditor key={stagedQuestions.length} initialQuestion={seed} examType={examType} onStage={handleStage} />
          <div style={{ marginTop: '0.75rem' }}>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Staged: {stagedQuestions.length} question{stagedQuestions.length === 1 ? '' : 's'}
            </p>
            {stagedQuestions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                {stagedQuestions.map((q, i) => (
                  <span
                    key={q.localId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      border: '1px solid var(--ap-border)',
                      borderRadius: 6,
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    Q{i + 1}
                    <button
                      type="button"
                      onClick={() => handleRemove(q.localId)}
                      aria-label={`Remove question ${i + 1} from batch`}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ap-danger)', fontWeight: 700, padding: 0 }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Button type="button" size="sm" disabled={stagedQuestions.length === 0} onClick={() => setMode('review')}>
              Review &amp; Upload All ({stagedQuestions.length})
            </Button>
          </div>
        </>
      ) : (
        <div>
          {stagedQuestions.length === 0 ? (
            <p style={{ color: 'var(--ap-text-muted)' }}>Nothing left to review.</p>
          ) : (
            stagedQuestions.map((q, i) => (
              <div key={q.localId} style={{ marginBottom: '0.7rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Question {i + 1}</p>
                <StagedQuestionCard question={q} onRemove={() => handleRemove(q.localId)} />
              </div>
            ))
          )}
          <div className={formStyles.actions} style={{ marginTop: '0.5rem' }}>
            <Button type="button" size="sm" disabled={stagedQuestions.length === 0 || committing} onClick={handleCommit}>
              {committing ? 'Uploading…' : `Confirm & Upload All (${stagedQuestions.length})`}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setMode('build')}>
              Back to Editing
            </Button>
          </div>
          {commitSummary && <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>{commitSummary}</p>}
        </div>
      )}
    </div>
  );
}

function StagedQuestionCard({ question, onRemove }) {
  return (
    <div className={formStyles.card}>
      <div className={formStyles.cardHeader}>
        <Badge tone="accent">{TYPE_LABELS[question.type] || question.type}</Badge>
        <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      </div>
      {question._error && <p className={formStyles.errorMsg}>{question._error}</p>}
      <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)', marginBottom: '0.4rem' }}>
        {[question.chapter, question.topic, question.subject].filter(Boolean).join(' · ') || 'No chapter/topic set'}
        {' — '}
        {question.marks} marks / −{question.negativeMarks}
        {question.difficulty ? ` — ${question.difficulty}` : ''}
      </p>
      {question.text && <p style={{ marginBottom: '0.4rem' }}>{question.text}</p>}
      {question.imageUrl && (
        <img
          src={assetUrl(question.imageUrl)}
          alt=""
          style={{ maxWidth: 260, maxHeight: 160, display: 'block', border: '1px solid var(--ap-border)', borderRadius: 6, marginBottom: '0.5rem' }}
        />
      )}
      {question.type === 'numerical' ? (
        <p style={{ fontSize: '0.9rem' }}>
          Answer: <strong>{question.correctNumericAnswer}</strong>
          {question.numericTolerance ? ` ± ${question.numericTolerance}` : ''}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {(question.options || []).map((opt, i) => {
            const correct = question.correctOptionIndexes?.includes(i);
            return (
              <div
                key={i}
                style={{
                  border: `1.5px solid ${correct ? 'var(--ap-success)' : 'var(--ap-border)'}`,
                  background: correct ? 'rgba(46, 160, 67, 0.08)' : 'transparent',
                  borderRadius: 6,
                  padding: '0.4rem 0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                <span style={{ fontWeight: 700 }}>
                  {String.fromCharCode(65 + i)}
                  {correct ? ' ✓' : ''}
                </span>
                {opt.imageUrl ? (
                  <img src={assetUrl(opt.imageUrl)} alt="" style={{ maxWidth: 160, maxHeight: 80 }} />
                ) : (
                  <span>{opt.text}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
