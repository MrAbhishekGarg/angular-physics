import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import QuestionEditor from '../../components/dashboard/QuestionEditor.jsx';
import ScreenshotQuestionBuilder from '../../components/dashboard/ScreenshotQuestionBuilder.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { questionService } from '../../services/questionService.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import formStyles from './DashboardForm.module.css';

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

export default function QuestionUpload() {
  const { user } = useAuth();
  const canCreate = !user?.restrictedActions?.includes('questions-create');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddMessage, setQuickAddMessage] = useState('');

  const [docxForm, setDocxForm] = useState({
    examType: EXAM_TRACKS[0].key,
    chapter: '',
    topic: '',
    difficulty: 'medium',
    author: '',
    subject: '',
    tags: '',
  });
  const [docxFile, setDocxFile] = useState(null);
  const [docxExcelFile, setDocxExcelFile] = useState(null);
  const [docxBusy, setDocxBusy] = useState(false);
  const [docxMessage, setDocxMessage] = useState('');
  const [docxWarnings, setDocxWarnings] = useState([]);
  const [docxFailed, setDocxFailed] = useState(false);

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

  const [excelScreenshotForm, setExcelScreenshotForm] = useState({
    examType: EXAM_TRACKS[0].key,
    chapter: '',
    topic: '',
    difficulty: 'medium',
    author: '',
    subject: '',
    tags: '',
  });
  const [excelScreenshotFile, setExcelScreenshotFile] = useState(null);
  const [excelScreenshotBusy, setExcelScreenshotBusy] = useState(false);
  const [excelScreenshotMessage, setExcelScreenshotMessage] = useState('');
  const [excelScreenshotWarnings, setExcelScreenshotWarnings] = useState([]);
  const [excelScreenshotFailed, setExcelScreenshotFailed] = useState(false);

  const handleDocxUpload = async () => {
    if (!docxFile || !docxExcelFile) return;
    setDocxBusy(true);
    setDocxMessage('');
    setDocxWarnings([]);
    setDocxFailed(false);
    try {
      const { questions: created, warnings } = await questionService.bulkUploadDocxScreenshots(docxFile, docxExcelFile, docxForm);
      setDocxMessage(`Added ${created.length} question${created.length === 1 ? '' : 's'} to the bank.`);
      setDocxWarnings(warnings);
      setDocxFile(null);
      setDocxExcelFile(null);
    } catch (err) {
      setDocxWarnings([err.message]);
      setDocxFailed(true);
    } finally {
      setDocxBusy(false);
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
    } catch (err) {
      setScreenshotWarnings([err.message]);
      setScreenshotFailed(true);
    } finally {
      setScreenshotBusy(false);
    }
  };

  const handleExcelScreenshotUpload = async () => {
    if (!excelScreenshotFile) return;
    setExcelScreenshotBusy(true);
    setExcelScreenshotMessage('');
    setExcelScreenshotWarnings([]);
    setExcelScreenshotFailed(false);
    try {
      const { questions: created, warnings } = await questionService.bulkUploadExcelScreenshots(
        excelScreenshotFile,
        excelScreenshotForm
      );
      setExcelScreenshotMessage(`Added ${created.length} question${created.length === 1 ? '' : 's'} to the bank.`);
      setExcelScreenshotWarnings(warnings);
      setExcelScreenshotFile(null);
    } catch (err) {
      setExcelScreenshotWarnings([err.message]);
      setExcelScreenshotFailed(true);
    } finally {
      setExcelScreenshotBusy(false);
    }
  };

  return (
    <>
      <SEO title="Question Uploading" description="Add new questions to the bank." path="/dashboard/mentor/questions/upload" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <h1>Question Uploading</h1>
          <p style={{ color: 'var(--ap-text-muted)' }}>
            Every way to add a new question to the bank lives here. Looking for a question you already added?
            That's in <Link to="/dashboard/mentor/questions">Question Bank</Link>.
          </p>

          {canCreate && <ScreenshotQuestionBuilder examType={undefined} onUploaded={() => {}} />}

          {canCreate && (
            <div className={formStyles.card}>
              <strong>Bulk Upload — Screenshots in a Word Doc</strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)', margin: '0.3rem 0' }}>
                For pasting straight out of a PDF or your own scanned questions — type <code>Q1.</code> on its own
                line, then <code>[A]</code>, <code>[B]</code>, <code>[C]</code>, <code>[D]</code> (square brackets)
                each on their own line, and repeat for every question. For each one, either{' '}
                <strong>type its value directly</strong> right after the marker (e.g. <code>[A] 1.2 J</code>) if it's
                plain text, <strong>or paste a screenshot</strong> on the next line if it's an equation or diagram —
                never both unless it genuinely needs both. Whatever you type is stored exactly as typed, never
                re-parsed or auto-corrected, so there's no font/equation garbling risk even for typed text. Only
                screenshot what actually needs it — most options in a real question (numbers, short phrases) can
                just be typed.
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--ap-warning)', margin: '0.3rem 0' }}>
                Use <code>[A]</code>, not <code>A)</code> — Word's AutoCorrect silently turns a typed <code>A)</code> at
                the start of a line into an automatic numbered list the moment you press Enter, which erases the
                literal "A)" text entirely and makes every option collapse into the stem. Square brackets aren't a
                pattern Word auto-converts, so they always stay as typed.
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)', margin: '0.3rem 0' }}>
                Answers, marks, chapter, etc. still come from the same Excel mapping sheet the option above uses —{' '}
                <a
                  href="/templates/docx-screenshot-questions-template.docx"
                  download
                  style={{ color: 'var(--ap-accent)', fontWeight: 700, textDecoration: 'underline' }}
                >
                  download the sample Word doc
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
                    <select value={docxForm.examType} onChange={(e) => setDocxForm((f) => ({ ...f, examType: e.target.value }))}>
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
                    <select value={docxForm.difficulty} onChange={(e) => setDocxForm((f) => ({ ...f, difficulty: e.target.value }))}>
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
                      value={docxForm.chapter}
                      onChange={(e) => setDocxForm((f) => ({ ...f, chapter: e.target.value }))}
                      placeholder="used when a row doesn't set one"
                    />
                  </label>
                  <label>
                    Topic (fallback)
                    <input
                      value={docxForm.topic}
                      onChange={(e) => setDocxForm((f) => ({ ...f, topic: e.target.value }))}
                      placeholder="used when a row doesn't set one"
                    />
                  </label>
                </div>
                <div className={formStyles.row}>
                  <label>
                    Author / Source (fallback)
                    <input
                      value={docxForm.author}
                      onChange={(e) => setDocxForm((f) => ({ ...f, author: e.target.value }))}
                      placeholder="used when a row doesn't set its own"
                    />
                  </label>
                  <label>
                    Subject (fallback)
                    <input
                      value={docxForm.subject}
                      onChange={(e) => setDocxForm((f) => ({ ...f, subject: e.target.value }))}
                      placeholder="used when a row doesn't set its own"
                    />
                  </label>
                </div>
                <label>
                  Tags (comma-separated, fallback)
                  <input
                    value={docxForm.tags}
                    onChange={(e) => setDocxForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="used when a row doesn't set its own"
                  />
                </label>
                <div className={formStyles.row}>
                  <label>
                    Word doc (screenshots)
                    <input type="file" accept=".docx" onChange={(e) => setDocxFile(e.target.files[0])} />
                  </label>
                  <label>
                    Excel sheet (mapping)
                    <input type="file" accept=".xlsx,.xls" onChange={(e) => setDocxExcelFile(e.target.files[0])} />
                  </label>
                </div>
                <div className={formStyles.actions}>
                  <Button type="button" size="sm" disabled={!docxFile || !docxExcelFile || docxBusy} onClick={handleDocxUpload}>
                    {docxBusy ? 'Uploading…' : 'Upload & Add to Bank'}
                  </Button>
                </div>
                <UploadFeedback message={docxMessage} warnings={docxWarnings} failed={docxFailed} />
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

          {canCreate && (
            <div className={formStyles.card}>
              <strong>Bulk Upload — Excel with Pasted Screenshots</strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)', margin: '0.3rem 0' }}>
                The simplest option — one file, no separate images. Paste a screenshot directly into the "Stem",
                "Option A", "Option B", "Option C", "Option D" cells (Ctrl+V after copying), one row per question,
                and fill in the Answer/Marks/Chapter/etc. columns as usual. Leave the Option columns blank for a
                numerical question.{' '}
                <a
                  href="/templates/screenshot-questions-template.xlsx"
                  download
                  style={{ color: 'var(--ap-accent)', fontWeight: 700, textDecoration: 'underline' }}
                >
                  Download the sample template
                </a>
                .
              </p>
              <div className={formStyles.form}>
                <div className={formStyles.row}>
                  <label>
                    Exam type (fallback — leave blank to keep unmapped unless a row sets one)
                    <select
                      value={excelScreenshotForm.examType}
                      onChange={(e) => setExcelScreenshotForm((f) => ({ ...f, examType: e.target.value }))}
                    >
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
                    <select
                      value={excelScreenshotForm.difficulty}
                      onChange={(e) => setExcelScreenshotForm((f) => ({ ...f, difficulty: e.target.value }))}
                    >
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
                      value={excelScreenshotForm.chapter}
                      onChange={(e) => setExcelScreenshotForm((f) => ({ ...f, chapter: e.target.value }))}
                      placeholder="used when a row doesn't set one"
                    />
                  </label>
                  <label>
                    Topic (fallback)
                    <input
                      value={excelScreenshotForm.topic}
                      onChange={(e) => setExcelScreenshotForm((f) => ({ ...f, topic: e.target.value }))}
                      placeholder="used when a row doesn't set one"
                    />
                  </label>
                </div>
                <div className={formStyles.row}>
                  <label>
                    Author / Source (fallback)
                    <input
                      value={excelScreenshotForm.author}
                      onChange={(e) => setExcelScreenshotForm((f) => ({ ...f, author: e.target.value }))}
                      placeholder="used when a row doesn't set its own"
                    />
                  </label>
                  <label>
                    Subject (fallback)
                    <input
                      value={excelScreenshotForm.subject}
                      onChange={(e) => setExcelScreenshotForm((f) => ({ ...f, subject: e.target.value }))}
                      placeholder="used when a row doesn't set its own"
                    />
                  </label>
                </div>
                <label>
                  Tags (comma-separated, fallback)
                  <input
                    value={excelScreenshotForm.tags}
                    onChange={(e) => setExcelScreenshotForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="used when a row doesn't set its own"
                  />
                </label>
                <label>
                  Excel sheet (with pasted screenshots)
                  <input type="file" accept=".xlsx,.xls" onChange={(e) => setExcelScreenshotFile(e.target.files[0])} />
                </label>
                <div className={formStyles.actions}>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!excelScreenshotFile || excelScreenshotBusy}
                    onClick={handleExcelScreenshotUpload}
                  >
                    {excelScreenshotBusy ? 'Uploading…' : 'Upload & Add to Bank'}
                  </Button>
                </div>
                <UploadFeedback message={excelScreenshotMessage} warnings={excelScreenshotWarnings} failed={excelScreenshotFailed} />
              </div>
            </div>
          )}

          {canCreate && (
            <div className={formStyles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <strong>Quick Add — single question, typed or pasted</strong>
                <Button size="sm" variant="ghost" onClick={() => setShowQuickAdd((v) => !v)}>
                  {showQuickAdd ? 'Close' : 'Open'}
                </Button>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)', margin: '0.3rem 0' }}>
                Type a question directly (or paste screenshots into it) and it saves to the bank immediately — no
                batching or review step. Best for adding just one or two questions.
              </p>
              {quickAddMessage && <p style={{ color: 'var(--ap-success)', fontSize: '0.85rem' }}>{quickAddMessage}</p>}
              {showQuickAdd && <QuestionEditor onSaved={() => setQuickAddMessage('Question added to the bank.')} />}
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
