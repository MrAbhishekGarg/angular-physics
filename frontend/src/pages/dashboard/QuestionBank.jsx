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

/**
 * A hard failure (whole upload rejected — corrupt file, unreadable sheet)
 * reads very differently from a soft one (upload succeeded, but some rows
 * had issues and were skipped) — collapsing both into one neutral list
 * made it easy to miss that something actually went wrong.
 */
function UploadFeedback({ message, warnings, failed }) {
  if (!message && warnings.length === 0) return null;
  return (
    <div style={{ marginTop: '0.5rem' }}>
      {message && <p style={{ color: 'var(--ap-success)', fontSize: '0.85rem' }}>{message}</p>}
      {failed ? (
        <p className={formStyles.errorMsg} style={{ fontWeight: 700 }}>
          Upload failed: {warnings[0]}
        </p>
      ) : (
        warnings.length > 0 && (
          <>
            <p style={{ color: 'var(--ap-warning)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.2rem' }}>
              {warnings.length} question{warnings.length === 1 ? '' : 's'} skipped or need attention:
            </p>
            <ul style={{ color: 'var(--ap-warning)', fontSize: '0.8rem', paddingLeft: '1.2rem' }}>
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </>
        )
      )}
    </div>
  );
}

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
  const [showCreate, setShowCreate] = useState(false);
  const [qotdId, setQotdId] = useState(null);
  const [qotdBusyId, setQotdBusyId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [bulkForm, setBulkForm] = useState({
    examType: EXAM_TRACKS[0].key,
    chapter: '',
    topic: '',
    difficulty: 'medium',
    isPYQ: false,
    pyqYear: '',
    author: '',
    subject: '',
    tags: '',
  });
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkWarnings, setBulkWarnings] = useState([]);
  const [bulkFailed, setBulkFailed] = useState(false);

  const [mappedForm, setMappedForm] = useState({
    examType: EXAM_TRACKS[0].key,
    chapter: '',
    topic: '',
    difficulty: 'medium',
    author: '',
    subject: '',
    tags: '',
  });
  const [mappedDocxFile, setMappedDocxFile] = useState(null);
  const [mappedExcelFile, setMappedExcelFile] = useState(null);
  const [mappedBusy, setMappedBusy] = useState(false);
  const [mappedMessage, setMappedMessage] = useState('');
  const [mappedWarnings, setMappedWarnings] = useState([]);
  const [mappedFailed, setMappedFailed] = useState(false);

  const [screenshotForm, setScreenshotForm] = useState({
    examType: EXAM_TRACKS[0].key,
    chapter: '',
    topic: '',
    difficulty: 'medium',
    author: '',
    subject: '',
    tags: '',
  });
  const [screenshotFiles, setScreenshotFiles] = useState([]);
  const [screenshotExcelFile, setScreenshotExcelFile] = useState(null);
  const [screenshotBusy, setScreenshotBusy] = useState(false);
  const [screenshotMessage, setScreenshotMessage] = useState('');
  const [screenshotWarnings, setScreenshotWarnings] = useState([]);
  const [screenshotFailed, setScreenshotFailed] = useState(false);

  const handleFilterChange = (e) => setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleMappedUpload = async () => {
    if (!mappedDocxFile || !mappedExcelFile) return;
    setMappedBusy(true);
    setMappedMessage('');
    setMappedWarnings([]);
    setMappedFailed(false);
    try {
      const { questions: created, warnings } = await questionService.bulkUploadMapped(mappedDocxFile, mappedExcelFile, mappedForm);
      setMappedMessage(`Added ${created.length} question${created.length === 1 ? '' : 's'} to the bank.`);
      setMappedWarnings(warnings);
      setMappedDocxFile(null);
      setMappedExcelFile(null);
      await refetch();
    } catch (err) {
      setMappedWarnings([err.message]);
      setMappedFailed(true);
    } finally {
      setMappedBusy(false);
    }
  };

  const handleScreenshotUpload = async () => {
    if (screenshotFiles.length === 0 || !screenshotExcelFile) return;
    setScreenshotBusy(true);
    setScreenshotMessage('');
    setScreenshotWarnings([]);
    setScreenshotFailed(false);
    try {
      const { questions: created, warnings } = await questionService.bulkUploadScreenshots(
        screenshotFiles,
        screenshotExcelFile,
        screenshotForm
      );
      setScreenshotMessage(`Added ${created.length} question${created.length === 1 ? '' : 's'} to the bank.`);
      setScreenshotWarnings(warnings);
      setScreenshotFiles([]);
      setScreenshotExcelFile(null);
      await refetch();
    } catch (err) {
      setScreenshotWarnings([err.message]);
      setScreenshotFailed(true);
    } finally {
      setScreenshotBusy(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;
    setBulkBusy(true);
    setBulkMessage('');
    setBulkWarnings([]);
    setBulkFailed(false);
    try {
      const { questions: created, warnings } = await questionService.bulkUpload(bulkFile, bulkForm);
      setBulkMessage(`Added ${created.length} question${created.length === 1 ? '' : 's'} to the bank.`);
      setBulkWarnings(warnings);
      setBulkFile(null);
      await refetch();
    } catch (err) {
      setBulkWarnings([err.message]);
      setBulkFailed(true);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleSaved = () => {
    setEditingQuestion(null);
    setShowCreate(false);
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
              PDFs from <Link to="/dashboard/mentor/worksheets">Manage Worksheets</Link>.
            </p>

            {canCreate && (
            <div className={formStyles.card}>
              <strong>Bulk Upload Questions</strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)', margin: '0.3rem 0' }}>
                Tag the whole batch, then upload a .docx following the required format —{' '}
                <a
                  href="/templates/bulk-questions-template.docx"
                  download
                  style={{ color: 'var(--ap-accent)', fontWeight: 700, textDecoration: 'underline' }}
                >
                  download the sample template
                </a>
                . Write <code>[CC:code]</code> next to any question to map just that question to a specific chapter/topic
                from your{' '}
                <Link to="/dashboard/mentor/concept-codes">Concept Code list</Link>, overriding the batch tags below.
              </p>
              <div className={formStyles.form}>
                <div className={formStyles.row}>
                  <label>
                    Exam type (optional — leave blank to keep unmapped)
                    <select value={bulkForm.examType} onChange={(e) => setBulkForm((f) => ({ ...f, examType: e.target.value }))}>
                      <option value="">None</option>
                      {EXAM_TRACKS.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Difficulty
                    <select value={bulkForm.difficulty} onChange={(e) => setBulkForm((f) => ({ ...f, difficulty: e.target.value }))}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </label>
                </div>
                <div className={formStyles.row}>
                  <label>
                    Chapter
                    <input
                      value={bulkForm.chapter}
                      onChange={(e) => setBulkForm((f) => ({ ...f, chapter: e.target.value }))}
                      placeholder="e.g. Current Electricity"
                    />
                  </label>
                  <label>
                    Topic
                    <input
                      value={bulkForm.topic}
                      onChange={(e) => setBulkForm((f) => ({ ...f, topic: e.target.value }))}
                      placeholder="e.g. Resistivity"
                    />
                  </label>
                </div>
                <div className={formStyles.row}>
                  <label className={formStyles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={bulkForm.isPYQ}
                      onChange={(e) => setBulkForm((f) => ({ ...f, isPYQ: e.target.checked }))}
                    />
                    Previous Year Question (PYQ) batch
                  </label>
                  {bulkForm.isPYQ && (
                    <label>
                      Year
                      <input
                        type="number"
                        value={bulkForm.pyqYear}
                        onChange={(e) => setBulkForm((f) => ({ ...f, pyqYear: e.target.value }))}
                        placeholder="e.g. 2023"
                      />
                    </label>
                  )}
                </div>
                <div className={formStyles.row}>
                  <label>
                    Author / Source (optional)
                    <input
                      value={bulkForm.author}
                      onChange={(e) => setBulkForm((f) => ({ ...f, author: e.target.value }))}
                      placeholder="e.g. Abhishek Garg, NCERT, Allen DPP"
                    />
                  </label>
                  <label>
                    Subject (optional)
                    <input
                      value={bulkForm.subject}
                      onChange={(e) => setBulkForm((f) => ({ ...f, subject: e.target.value }))}
                      placeholder="e.g. Physics"
                    />
                  </label>
                </div>
                <label>
                  Tags (comma-separated, optional)
                  <input
                    value={bulkForm.tags}
                    onChange={(e) => setBulkForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="e.g. Tricky, Revision"
                  />
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="file" accept=".docx" onChange={(e) => setBulkFile(e.target.files[0])} style={{ flex: 1, minWidth: 200 }} />
                  <Button type="button" size="sm" disabled={!bulkFile || bulkBusy} onClick={handleBulkUpload}>
                    {bulkBusy ? 'Parsing…' : 'Upload & Add to Bank'}
                  </Button>
                </div>
                <UploadFeedback message={bulkMessage} warnings={bulkWarnings} failed={bulkFailed} />
              </div>
            </div>
            )}

            {canCreate && (
            <div className={formStyles.card}>
              <strong>Bulk Upload — Word + Excel Mapping</strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)', margin: '0.3rem 0' }}>
                Type questions and options in a plain Word doc — no inline tags needed — then map concept codes,
                exam type(s), subject, answers, marks, author, tags, and PYQ tagging per question number in a
                separate Excel sheet.{' '}
                <a
                  href="/templates/mapped-questions-template.docx"
                  download
                  style={{ color: 'var(--ap-accent)', fontWeight: 700, textDecoration: 'underline' }}
                >
                  Download the sample Word doc
                </a>{' '}
                and{' '}
                <a
                  href="/templates/mapped-questions-mapping-template.xlsx"
                  download
                  style={{ color: 'var(--ap-accent)', fontWeight: 700, textDecoration: 'underline' }}
                >
                  the matching Excel sheet
                </a>
                .
              </p>
              <div className={formStyles.form}>
                <div className={formStyles.row}>
                  <label>
                    Exam type (fallback — leave blank to keep unmapped unless a row sets one)
                    <select value={mappedForm.examType} onChange={(e) => setMappedForm((f) => ({ ...f, examType: e.target.value }))}>
                      <option value="">None</option>
                      {EXAM_TRACKS.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Difficulty (fallback when a row doesn't set one)
                    <select value={mappedForm.difficulty} onChange={(e) => setMappedForm((f) => ({ ...f, difficulty: e.target.value }))}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </label>
                </div>
                <div className={formStyles.row}>
                  <label>
                    Chapter (fallback)
                    <input
                      value={mappedForm.chapter}
                      onChange={(e) => setMappedForm((f) => ({ ...f, chapter: e.target.value }))}
                      placeholder="used when a row and no concept code set one"
                    />
                  </label>
                  <label>
                    Topic (fallback)
                    <input
                      value={mappedForm.topic}
                      onChange={(e) => setMappedForm((f) => ({ ...f, topic: e.target.value }))}
                      placeholder="used when a row and no concept code set one"
                    />
                  </label>
                </div>
                <div className={formStyles.row}>
                  <label>
                    Author / Source (fallback)
                    <input
                      value={mappedForm.author}
                      onChange={(e) => setMappedForm((f) => ({ ...f, author: e.target.value }))}
                      placeholder="used when a row doesn't set its own"
                    />
                  </label>
                  <label>
                    Subject (fallback)
                    <input
                      value={mappedForm.subject}
                      onChange={(e) => setMappedForm((f) => ({ ...f, subject: e.target.value }))}
                      placeholder="used when a row doesn't set its own"
                    />
                  </label>
                </div>
                <label>
                  Tags (comma-separated, fallback)
                  <input
                    value={mappedForm.tags}
                    onChange={(e) => setMappedForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="used when a row doesn't set its own"
                  />
                </label>
                <div className={formStyles.row}>
                  <label>
                    Word doc (questions)
                    <input type="file" accept=".docx" onChange={(e) => setMappedDocxFile(e.target.files[0])} />
                  </label>
                  <label>
                    Excel sheet (mapping)
                    <input type="file" accept=".xlsx,.xls" onChange={(e) => setMappedExcelFile(e.target.files[0])} />
                  </label>
                </div>
                <div className={formStyles.actions}>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!mappedDocxFile || !mappedExcelFile || mappedBusy}
                    onClick={handleMappedUpload}
                  >
                    {mappedBusy ? 'Parsing…' : 'Upload & Add to Bank'}
                  </Button>
                </div>
                <UploadFeedback message={mappedMessage} warnings={mappedWarnings} failed={mappedFailed} />
              </div>
            </div>
            )}

            {canCreate && (
            <div className={formStyles.card}>
              <strong>Bulk Upload — Screenshots + Excel Mapping</strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)', margin: '0.3rem 0' }}>
                For when equations or symbols typed in Word don't extract correctly (a special font maps a keystroke
                to the wrong character, and there's no way to tell from the file). Screenshot each question — the
                stem/diagram, and every option separately — and upload the images directly; nothing is parsed, so
                nothing can be misread. Name each file <code>Q1.png</code> for the stem/diagram and{' '}
                <code>Q1-A.png</code>, <code>Q1-B.png</code>, <code>Q1-C.png</code>, <code>Q1-D.png</code> for
                options (continue numbering for every question in the batch), then select every image at once. Pair
                it with the same mapping sheet used above —{' '}
                <a
                  href="/templates/mapped-questions-mapping-template.xlsx"
                  download
                  style={{ color: 'var(--ap-accent)', fontWeight: 700, textDecoration: 'underline' }}
                >
                  download the sample Excel sheet
                </a>{' '}
                if you don't already have it open.
              </p>
              <div className={formStyles.form}>
                <div className={formStyles.row}>
                  <label>
                    Exam type (fallback — leave blank to keep unmapped unless a row sets one)
                    <select value={screenshotForm.examType} onChange={(e) => setScreenshotForm((f) => ({ ...f, examType: e.target.value }))}>
                      <option value="">None</option>
                      {EXAM_TRACKS.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Difficulty (fallback when a row doesn't set one)
                    <select value={screenshotForm.difficulty} onChange={(e) => setScreenshotForm((f) => ({ ...f, difficulty: e.target.value }))}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </label>
                </div>
                <div className={formStyles.row}>
                  <label>
                    Chapter (fallback)
                    <input
                      value={screenshotForm.chapter}
                      onChange={(e) => setScreenshotForm((f) => ({ ...f, chapter: e.target.value }))}
                      placeholder="used when a row doesn't set one"
                    />
                  </label>
                  <label>
                    Topic (fallback)
                    <input
                      value={screenshotForm.topic}
                      onChange={(e) => setScreenshotForm((f) => ({ ...f, topic: e.target.value }))}
                      placeholder="used when a row doesn't set one"
                    />
                  </label>
                </div>
                <div className={formStyles.row}>
                  <label>
                    Author / Source (fallback)
                    <input
                      value={screenshotForm.author}
                      onChange={(e) => setScreenshotForm((f) => ({ ...f, author: e.target.value }))}
                      placeholder="used when a row doesn't set its own"
                    />
                  </label>
                  <label>
                    Subject (fallback)
                    <input
                      value={screenshotForm.subject}
                      onChange={(e) => setScreenshotForm((f) => ({ ...f, subject: e.target.value }))}
                      placeholder="used when a row doesn't set its own"
                    />
                  </label>
                </div>
                <label>
                  Tags (comma-separated, fallback)
                  <input
                    value={screenshotForm.tags}
                    onChange={(e) => setScreenshotForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="used when a row doesn't set its own"
                  />
                </label>
                <div className={formStyles.row}>
                  <label>
                    Screenshots (Q1.png, Q1-A.png, Q1-B.png, ...)
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={(e) => setScreenshotFiles([...e.target.files])}
                    />
                    {screenshotFiles.length > 0 && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>
                        {screenshotFiles.length} file{screenshotFiles.length === 1 ? '' : 's'} selected
                      </span>
                    )}
                  </label>
                  <label>
                    Excel sheet (mapping)
                    <input type="file" accept=".xlsx,.xls" onChange={(e) => setScreenshotExcelFile(e.target.files[0])} />
                  </label>
                </div>
                <div className={formStyles.actions}>
                  <Button
                    type="button"
                    size="sm"
                    disabled={screenshotFiles.length === 0 || !screenshotExcelFile || screenshotBusy}
                    onClick={handleScreenshotUpload}
                  >
                    {screenshotBusy ? 'Uploading…' : 'Upload & Add to Bank'}
                  </Button>
                </div>
                <UploadFeedback message={screenshotMessage} warnings={screenshotWarnings} failed={screenshotFailed} />
              </div>
            </div>
            )}

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
                  <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
                    {showCreate ? 'Close' : '+ New Question'}
                  </Button>
                )}
              </div>
            </div>

            {canCreate && showCreate && (
              <QuestionEditor
                examType={filters.examType || undefined}
                onSaved={handleSaved}
                onCancel={() => setShowCreate(false)}
              />
            )}

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
