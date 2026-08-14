import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import QuestionEditor from '../../components/dashboard/QuestionEditor.jsx';
import { useMentorCourses } from '../../hooks/useCourses.js';
import { useQuestions } from '../../hooks/useQuestions.js';
import { useAuth } from '../../hooks/useAuth.js';
import { testService } from '../../services/testService.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import formStyles from './DashboardForm.module.css';

const emptyForm = {
  title: '',
  description: '',
  examType: EXAM_TRACKS[0].key,
  durationMinutes: 60,
  isPaid: false,
  price: '',
  status: 'draft',
  courseIds: [],
  kind: 'test',
  isProctored: true,
  liveUntil: '',
};

const emptySection = (index) => ({ name: `Section ${index + 1}`, instructions: '', questionIds: [], questions: [] });

/** Convert an ISO date to the value <input type="datetime-local"> expects (local time, no seconds/zone). */
function toDatetimeLocal(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SectionEditor({ section, index, examType, onUpdate, onRemove, canRemove }) {
  const [bankFilters, setBankFilters] = useState({
    examType,
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
  const { data: bankQuestions, loading: bankLoading } = useQuestions(bankFilters);
  const [showCreateQuestion, setShowCreateQuestion] = useState(false);

  const handleBankFilterChange = (e) => setBankFilters((f) => ({ ...f, [e.target.name]: e.target.value }));

  const toggleQuestion = (question) => {
    const has = section.questionIds.includes(question._id);
    onUpdate({
      questionIds: has ? section.questionIds.filter((qid) => qid !== question._id) : [...section.questionIds, question._id],
      questions: has ? section.questions.filter((q) => q._id !== question._id) : [...section.questions, question],
    });
  };

  const removeSelected = (questionId) => {
    onUpdate({
      questionIds: section.questionIds.filter((qid) => qid !== questionId),
      questions: section.questions.filter((q) => q._id !== questionId),
    });
  };

  const handleQuestionCreated = (question) => {
    onUpdate({ questionIds: [...section.questionIds, question._id], questions: [...section.questions, question] });
    setShowCreateQuestion(false);
  };

  return (
    <div className={formStyles.card} style={{ border: '1px solid var(--ap-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Section {index + 1}</strong>
        {canRemove && (
          <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
            Remove Section
          </Button>
        )}
      </div>

      <label>
        Section name
        <input
          value={section.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="e.g. Single Correct (Q1-20)"
          required
        />
      </label>
      <label>
        Section instructions (optional)
        <textarea
          rows="2"
          value={section.instructions}
          onChange={(e) => onUpdate({ instructions: e.target.value })}
          placeholder="e.g. Each question carries 4 marks, -1 for a wrong answer."
        />
      </label>

      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, margin: '0.5rem 0 0.35rem' }}>
        Questions ({section.questionIds.length} selected)
      </span>

      {section.questions.length > 0 && (
        <div className={formStyles.card}>
          <strong>Selected</strong>
          {section.questions.map((q) => (
            <div key={q._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0' }}>
              <span style={{ fontSize: '0.85rem' }}>{q.text.slice(0, 90)}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => removeSelected(q._id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className={formStyles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Pick from Question Bank</strong>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowCreateQuestion((v) => !v)}>
            {showCreateQuestion ? 'Close' : '+ New Question'}
          </Button>
        </div>
        <div className={formStyles.row}>
          <label>
            Chapter
            <input name="chapter" value={bankFilters.chapter} onChange={handleBankFilterChange} placeholder="Filter by chapter" />
          </label>
          <label>
            Difficulty
            <select name="difficulty" value={bankFilters.difficulty} onChange={handleBankFilterChange}>
              <option value="">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>
        <div className={formStyles.row}>
          <label>
            PYQ
            <select name="isPYQ" value={bankFilters.isPYQ} onChange={handleBankFilterChange}>
              <option value="">All</option>
              <option value="true">PYQ only</option>
              <option value="false">Non-PYQ only</option>
            </select>
          </label>
          <label>
            Author / Source
            <input name="author" value={bankFilters.author} onChange={handleBankFilterChange} placeholder="Filter by author or source" />
          </label>
        </div>
        <div className={formStyles.row}>
          <label>
            Subject
            <input name="subject" value={bankFilters.subject} onChange={handleBankFilterChange} placeholder="Filter by subject" />
          </label>
          <label>
            Tag
            <input name="tag" value={bankFilters.tag} onChange={handleBankFilterChange} placeholder="Filter by tag" />
          </label>
        </div>
        <div className={formStyles.row}>
          <label>
            Concept Code
            <input name="conceptCode" value={bankFilters.conceptCode} onChange={handleBankFilterChange} placeholder="Filter by concept code" />
          </label>
        </div>

        {bankLoading ? (
          <Spinner label="Loading bank…" />
        ) : (
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {(bankQuestions || []).map((q) => (
              <label
                key={q._id}
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.4rem 0', borderBottom: '1px solid var(--ap-border)' }}
              >
                <input type="checkbox" checked={section.questionIds.includes(q._id)} onChange={() => toggleQuestion(q)} style={{ marginTop: '0.2rem' }} />
                <span style={{ fontSize: '0.85rem', flex: 1 }}>
                  {q.text.slice(0, 90)}
                  <br />
                  <span style={{ color: 'var(--ap-text-muted)', fontSize: '0.75rem' }}>
                    {q.chapter || 'no chapter'} {q.topic ? `· ${q.topic}` : ''} · {q.difficulty}
                    {q.author ? ` · by ${q.author}` : ''}
                    {q.tags?.length > 0 ? ` · ${q.tags.join(', ')}` : ''}
                    {q.conceptCodes?.length > 0 ? ` · ${q.conceptCodes.join(', ')}` : ''}
                  </span>
                </span>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {q.isPYQ && <Badge tone="highlight">PYQ{q.pyqYear ? ` ${q.pyqYear}` : ''}</Badge>}
                  <Badge tone="default">{q.type}</Badge>
                </div>
              </label>
            ))}
            {bankQuestions && bankQuestions.length === 0 && (
              <p style={{ color: 'var(--ap-text-muted)', fontSize: '0.85rem' }}>No bank questions match these filters yet.</p>
            )}
          </div>
        )}
      </div>

      {showCreateQuestion && (
        <QuestionEditor examType={examType} onSaved={handleQuestionCreated} onCancel={() => setShowCreateQuestion(false)} />
      )}
    </div>
  );
}

export default function TestEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { data: courses } = useMentorCourses();
  const { user } = useAuth();
  const canManagePaid = user?.canManagePaidContent !== false;

  const [form, setForm] = useState(emptyForm);
  const [instructions, setInstructions] = useState('');
  const [sections, setSections] = useState([emptySection(0)]);
  const [loadingTest, setLoadingTest] = useState(isEdit);
  const [blockedPaid, setBlockedPaid] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    testService.getMentor(id).then((test) => {
      if (test.isPaid && !canManagePaid) {
        setBlockedPaid(true);
        setLoadingTest(false);
        return;
      }
      setForm({
        title: test.title,
        description: test.description || '',
        examType: test.examType,
        durationMinutes: test.durationMinutes,
        isPaid: test.isPaid,
        price: test.price || '',
        status: test.status,
        courseIds: (test.courseIds || []).map((c) => (typeof c === 'string' ? c : c._id)),
        kind: test.kind || 'test',
        isProctored: test.isProctored ?? true,
        liveUntil: toDatetimeLocal(test.liveUntil),
      });
      setInstructions(test.instructions || '');
      const questions = test.questions || [];
      if (test.sections && test.sections.length > 0) {
        setSections(
          test.sections.map((s) => {
            const qs = questions.slice(s.startIndex, s.endIndex + 1);
            return { name: s.name, instructions: s.instructions || '', questionIds: qs.map((q) => q._id), questions: qs };
          })
        );
      } else {
        setSections([{ name: 'Section 1', instructions: '', questionIds: questions.map((q) => q._id), questions }]);
      }
      setLoadingTest(false);
    });
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleCourse = (courseId) => {
    setForm((f) => ({
      ...f,
      courseIds: f.courseIds.includes(courseId)
        ? f.courseIds.filter((id_) => id_ !== courseId)
        : [...f.courseIds, courseId],
    }));
  };

  const updateSection = (index, patch) =>
    setSections((secs) => secs.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const addSection = () => setSections((secs) => [...secs, emptySection(secs.length)]);
  const removeSection = (index) => setSections((secs) => secs.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.courseIds.length === 0) {
      setError('Assign this test to at least one course before publishing.');
      setStatus('error');
      return;
    }
    if (sections.some((s) => !s.name.trim())) {
      setError('Every section needs a name.');
      setStatus('error');
      return;
    }
    const totalQuestions = sections.reduce((n, s) => n + s.questionIds.length, 0);
    if (totalQuestions === 0) {
      setError('Select at least one question from the bank.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setError('');

    const payload = {
      title: form.title,
      description: form.description,
      examType: form.examType,
      durationMinutes: Number(form.durationMinutes),
      isPaid: form.isPaid,
      price: form.isPaid ? Number(form.price) : 0,
      status: form.status,
      courseIds: form.courseIds,
      kind: form.kind,
      isProctored: form.isProctored,
      liveUntil: form.liveUntil ? new Date(form.liveUntil).toISOString() : null,
      instructions,
      sections: sections.map((s) => ({ name: s.name, instructions: s.instructions, questionIds: s.questionIds })),
    };

    try {
      if (isEdit) await testService.update(id, payload);
      else await testService.create(payload);
      navigate('/dashboard/mentor/tests');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  if (loadingTest) return <Spinner label="Loading test…" />;

  if (blockedPaid) {
    return (
      <>
        <SEO title="Edit Test" description="Author a test for students." path="/dashboard/mentor/tests" />
        <DashboardLayout role="mentor">
          <div className={formStyles.wrap}>
            <h1>Edit Test</h1>
            <ErrorState message="This is a paid test — you don't have permission to manage paid content. Ask an admin for access." />
          </div>
        </DashboardLayout>
      </>
    );
  }

  return (
    <>
      <SEO title={isEdit ? 'Edit Test' : 'New Test'} description="Author a test for students." path="/dashboard/mentor/tests" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap}>
          <h1>{isEdit ? 'Edit Test' : 'New Test'}</h1>

            <form className={formStyles.form} onSubmit={handleSubmit}>
              <div className={formStyles.row}>
                <label>
                  Title
                  <input name="title" required value={form.title} onChange={handleChange} />
                </label>
                <label>
                  Exam type
                  <select name="examType" value={form.examType} onChange={handleChange}>
                    {EXAM_TRACKS.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Description
                <textarea name="description" rows="2" value={form.description} onChange={handleChange} />
              </label>

              <div className={formStyles.row}>
                <label>
                  Duration (minutes)
                  <input
                    type="number"
                    name="durationMinutes"
                    min="1"
                    required
                    value={form.durationMinutes}
                    onChange={handleChange}
                  />
                </label>
                <label>
                  Status
                  <select name="status" value={form.status} onChange={handleChange}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </label>
              </div>

              <label>
                Live until (optional — leave blank to stay live forever once published)
                <input type="datetime-local" name="liveUntil" value={form.liveUntil} onChange={handleChange} />
              </label>

              <label className={formStyles.checkboxLabel}>
                <input type="checkbox" name="isProctored" checked={form.isProctored} onChange={handleChange} />
                Enforce proctoring (fullscreen/tab-switch detection)
              </label>

              <label className={formStyles.checkboxLabel}>
                <input type="checkbox" name="isPaid" checked={form.isPaid} onChange={handleChange} disabled={!canManagePaid} />
                This is paid
              </label>
              {!canManagePaid && (
                <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)', marginTop: '-0.5rem' }}>
                  You don't have permission to manage paid content — ask an admin for access.
                </p>
              )}

              {form.isPaid && (
                <label>
                  Price (₹)
                  <input type="number" name="price" min="1" required value={form.price} onChange={handleChange} />
                </label>
              )}

              <div>
                <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Assign to course(s) / batch(es)
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {(courses || []).map((c) => (
                    <label key={c._id} className={formStyles.checkboxLabel} style={{ fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        checked={form.courseIds.includes(c._id)}
                        onChange={() => toggleCourse(c._id)}
                      />
                      {c.title}
                    </label>
                  ))}
                </div>
              </div>

              <label>
                Instructions (shown before the exam starts)
                <textarea
                  rows="3"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. This test has 2 sections. Calculators are not allowed."
                />
              </label>

              <h2 style={{ color: 'var(--ap-primary)', marginTop: 'var(--ap-space-md)' }}>
                Sections ({sections.reduce((n, s) => n + s.questionIds.length, 0)} questions total)
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ap-space-md)' }}>
                {sections.map((section, index) => (
                  <SectionEditor
                    key={index}
                    section={section}
                    index={index}
                    examType={form.examType}
                    onUpdate={(patch) => updateSection(index, patch)}
                    onRemove={() => removeSection(index)}
                    canRemove={sections.length > 1}
                  />
                ))}
              </div>

              <Button type="button" variant="ghost" onClick={addSection} style={{ alignSelf: 'flex-start' }}>
                + Add Section
              </Button>

              <div className={formStyles.actions}>
                <Button type="submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Test'}
                </Button>
                <Button as={Link} to="/dashboard/mentor/tests" variant="ghost">
                  Cancel
                </Button>
              </div>

              {status === 'error' && <p className={formStyles.errorMsg}>{error}</p>}
            </form>
        </div>
      </DashboardLayout>
    </>
  );
}
