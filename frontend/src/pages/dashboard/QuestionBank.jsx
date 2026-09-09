import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import QuestionEditor from '../../components/dashboard/QuestionEditor.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useQuestions } from '../../hooks/useQuestions.js';
import { questionService } from '../../services/questionService.js';
import { questionOfDayService } from '../../services/questionOfDayService.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import formStyles from './DashboardForm.module.css';

const DIFFICULTY_TONE = { easy: 'success', medium: 'accent', hard: 'default' };

export default function QuestionBank() {
  const { user } = useAuth();
  const canCreate = !user?.restrictedActions?.includes('questions-create');
  const canEdit = !user?.restrictedActions?.includes('questions-edit');
  const [filters, setFilters] = useState({
    examType: '',
    chapter: '',
    topic: '',
    difficulty: '',
    search: '',
    isPYQ: '',
    author: '',
    tag: '',
    subject: '',
    conceptCode: '',
  });
  const { data: questions, loading, error, refetch } = useQuestions(filters);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [qotdId, setQotdId] = useState(null);
  const [qotdBusyId, setQotdBusyId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleFilterChange = (e) => setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSaved = () => {
    setEditingQuestion(null);
    refetch();
  };

  const handleDeleted = () => {
    setEditingQuestion(null);
    refetch();
  };

  const handleSetQotd = async (question) => {
    setQotdBusyId(question._id);
    try {
      await questionOfDayService.set(question._id);
      setQotdId(question._id);
    } finally {
      setQotdBusyId(null);
    }
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected question(s) from the bank? This can't be undone.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => questionService.remove(id)));
      setSelectedIds(new Set());
      await refetch();
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <>
      <SEO title="Question Bank" description="Manage the reusable question bank for tests and student practice." path="/dashboard/mentor/questions" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <h1>Question Bank</h1>
            <p style={{ color: 'var(--ap-text-muted)' }}>
              Every question here can be reused across any test — and students can generate topic/chapter-wise
              practice straight from this pool. Looking for DPPs or Assignments? Those are managed as downloadable
              PDFs from <Link to="/dashboard/mentor/worksheets">Manage Worksheets</Link>. To add new questions, go to{' '}
              <Link to="/dashboard/mentor/questions/upload">Question Uploading</Link>.
            </p>

            <div className={formStyles.card}>
              <div className={formStyles.form}>
                <div className={formStyles.row}>
                  <label>
                    Exam type
                    <select name="examType" value={filters.examType} onChange={handleFilterChange}>
                      <option value="">All</option>
                      {EXAM_TRACKS.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Difficulty
                    <select name="difficulty" value={filters.difficulty} onChange={handleFilterChange}>
                      <option value="">All</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </label>
                </div>
                <div className={formStyles.row}>
                  <label>
                    Chapter
                    <input name="chapter" value={filters.chapter} onChange={handleFilterChange} placeholder="Filter by chapter" />
                  </label>
                  <label>
                    Search text
                    <input name="search" value={filters.search} onChange={handleFilterChange} placeholder="Search question text" />
                  </label>
                </div>
                <div className={formStyles.row}>
                  <label>
                    PYQ
                    <select name="isPYQ" value={filters.isPYQ} onChange={handleFilterChange}>
                      <option value="">All</option>
                      <option value="true">PYQ only</option>
                      <option value="false">Non-PYQ only</option>
                    </select>
                  </label>
                  <label>
                    Author / Source
                    <input name="author" value={filters.author} onChange={handleFilterChange} placeholder="Filter by author or source" />
                  </label>
                </div>
                <div className={formStyles.row}>
                  <label>
                    Subject
                    <input name="subject" value={filters.subject} onChange={handleFilterChange} placeholder="Filter by subject" />
                  </label>
                  <label>
                    Tag
                    <input name="tag" value={filters.tag} onChange={handleFilterChange} placeholder="Filter by tag" />
                  </label>
                </div>
                <div className={formStyles.row}>
                  <label>
                    Concept Code
                    <input name="conceptCode" value={filters.conceptCode} onChange={handleFilterChange} placeholder="Filter by concept code" />
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--ap-space-sm)', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ color: 'var(--ap-primary)', margin: 0 }}>{questions ? `${questions.length} question(s)` : 'Questions'}</h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {canEdit && selectedIds.size > 0 && (
                  <Button size="sm" variant="danger" disabled={bulkDeleting} onClick={handleBulkDelete}>
                    {bulkDeleting ? 'Deleting…' : `Delete Selected (${selectedIds.size})`}
                  </Button>
                )}
                {canCreate && (
                  <Button as={Link} to="/dashboard/mentor/questions/upload" size="sm">
                    + Add Questions
                  </Button>
                )}
              </div>
            </div>

            {loading && <Spinner label="Loading questions…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}
            {questions && questions.length === 0 && <ErrorState message="No questions match these filters yet." />}

            {questions &&
              questions.map((q) =>
                canEdit && editingQuestion?._id === q._id ? (
                  <QuestionEditor
                    key={q._id}
                    initialQuestion={editingQuestion}
                    onSaved={handleSaved}
                    onCancel={() => setEditingQuestion(null)}
                    onDeleted={handleDeleted}
                  />
                ) : (
                  <div key={q._id} className={formStyles.card}>
                    <div className={formStyles.cardHeader}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        {canEdit && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(q._id)}
                            onChange={() => toggleSelected(q._id)}
                            style={{ marginTop: '0.25rem' }}
                            aria-label="Select question"
                          />
                        )}
                        <strong>{q.text.slice(0, 100)}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {q.isPYQ && <Badge tone="highlight">PYQ{q.pyqYear ? ` ${q.pyqYear}` : ''}</Badge>}
                        <Badge tone={DIFFICULTY_TONE[q.difficulty]}>{q.difficulty}</Badge>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>
                      {q.examTypes?.length > 0 ? q.examTypes.join(', ') : 'Unmapped'} · {q.type} ·{' '}
                      {q.chapter || 'no chapter'} {q.topic ? `· ${q.topic}` : ''} · {q.marks} marks
                      {q.subject ? ` · ${q.subject}` : ''}
                      {q.author ? ` · by ${q.author}` : ''}
                      {q.conceptCodes?.length > 0 ? ` · ${q.conceptCodes.join(', ')}` : ''}
                    </p>
                    {q.tags?.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                        {q.tags.map((t) => (
                          <Badge key={t} tone="default">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {canEdit && (
                        <Button size="sm" variant="ghost" onClick={() => setEditingQuestion(q)}>
                          Edit
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={qotdBusyId === q._id}
                        onClick={() => handleSetQotd(q)}
                      >
                        {qotdBusyId === q._id ? 'Setting…' : 'Set as Question of the Day'}
                      </Button>
                      {qotdId === q._id && <Badge tone="success">Live on homepage</Badge>}
                    </div>
                  </div>
                )
              )}
        </div>
      </DashboardLayout>
    </>
  );
}
