import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import MathText from '../../components/common/MathText.jsx';
import { questionService } from '../../services/questionService.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import formStyles from './DashboardForm.module.css';
import styles from './PdfQuestionReview.module.css';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * The JSON comes from a Claude conversation extracting a source PDF by
 * hand (see the "AITS Extraction Preview" demo this shape was validated
 * against) — this app never calls any AI API itself. `qNo` is accepted as a
 * fallback for `questionNumber` since that's what the very first demo JSON
 * used before the field was standardized.
 */
function normalizeQuestion(raw) {
  return {
    questionNumber: raw.questionNumber ?? raw.qNo,
    type: raw.type === 'numerical' ? 'numerical' : raw.type || 'mcq-single',
    text: raw.text || '',
    options: Array.isArray(raw.options) ? raw.options.map((o) => ({ text: o?.text || '', imageUrl: o?.imageUrl || undefined })) : [],
    imageUrl: raw.imageUrl || undefined,
    needsImage: Boolean(raw.needsImage),
    note: raw.note || raw._extractionNote || null,
    chapter: raw.chapter || '',
    topic: raw.topic || '',
  };
}

function PasteZone({ label, onImage }) {
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const handleFile = async (file) => {
    if (!file || !file.type?.startsWith('image/')) return;
    setBusy(true);
    try {
      const { imageUrl } = await questionService.uploadImage(file);
      onImage(imageUrl);
    } finally {
      setBusy(false);
      setDrag(false);
    }
  };

  return (
    <div
      className={`${styles.pastezone} ${drag ? styles.pastezoneDrag : ''}`}
      tabIndex={0}
      role="button"
      onClick={(e) => {
        if (e.target.tagName === 'INPUT') return;
        e.currentTarget.focus();
      }}
      onPaste={(e) => {
        const item = Array.from(e.clipboardData?.items || []).find((it) => it.type.startsWith('image/'));
        if (item) handleFile(item.getAsFile());
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        handleFile(e.dataTransfer.files[0]);
      }}
    >
      {busy ? (
        'Uploading…'
      ) : (
        <>
          📋 Click, then paste (Ctrl+V) {label} — or{' '}
          <label style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}>
            choose a file
            <input type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files[0])} />
          </label>
        </>
      )}
    </div>
  );
}

function ViewCard({ q, index, total, onPrev, onNext, onEdit }) {
  return (
    <>
      <div className={styles.qmeta}>
        <strong>Question {q.questionNumber}</strong>
        {q.chapter && <span className={styles.badge}>{q.chapter}</span>}
        {q.topic && <span className={styles.badge}>{q.topic}</span>}
        <Button type="button" size="sm" variant="ghost" onClick={onEdit} style={{ marginLeft: 'auto' }}>
          Edit
        </Button>
      </div>

      <div className={`${styles.qtext} ${formStyles.wrap}`}>
        <MathText text={q.text} as="div" />
      </div>

      {q.imageUrl ? (
        <div className={styles.diagramPreview}>
          <img src={q.imageUrl} alt={`Diagram for question ${q.questionNumber}`} />
        </div>
      ) : (
        q.needsImage && (
          <div className={`${styles.note} ${styles.noteWarn}`}>
            <span>⚠️</span>
            <div>
              <strong style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>Diagram flagged, not pasted yet</strong>
              {q.note}
            </div>
          </div>
        )
      )}
      {!q.needsImage && q.note && (
        <div className={styles.note}>
          <span>✓</span>
          <div>
            <strong style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>Extraction note</strong>
            {q.note}
          </div>
        </div>
      )}

      {q.type === 'numerical' ? (
        <p style={{ color: 'var(--ap-text-muted)', fontSize: '0.85rem', marginTop: 'auto' }}>Numerical answer type</p>
      ) : (
        <div className={styles.options}>
          {q.options.map((opt, i) => (
            <div className={styles.opt} key={i}>
              <span className={styles.optLabel}>{LETTERS[i]}</span>
              <span>
                <MathText text={opt.text} />
                {opt.imageUrl && <img src={opt.imageUrl} alt={`Option ${LETTERS[i]}`} className={styles.optImg} />}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.navrow}>
        <Button type="button" size="sm" variant="ghost" disabled={index === 0} onClick={onPrev}>
          ← Previous
        </Button>
        <span className={styles.navpos}>
          {index + 1} of {total}
        </span>
        <Button type="button" size="sm" disabled={index === total - 1} onClick={onNext}>
          Next →
        </Button>
      </div>
    </>
  );
}

function EditForm({ q, onChange, onOptionChange, onDone }) {
  return (
    <>
      <div className={styles.qmeta}>
        <strong>Editing Question {q.questionNumber}</strong>
      </div>
      <label>
        Question text (use $...$ for math)
        <textarea rows={5} value={q.text} onChange={(e) => onChange({ text: e.target.value })} style={{ width: '100%' }} />
      </label>
      <div style={{ margin: '0.6rem 0' }}>
        {q.imageUrl ? (
          <div className={styles.diagramPreview}>
            <img src={q.imageUrl} alt="Question" />
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ imageUrl: undefined })}>
              Remove image
            </Button>
          </div>
        ) : (
          <PasteZone label="a question image" onImage={(imageUrl) => onChange({ imageUrl })} />
        )}
      </div>

      {q.type !== 'numerical' && (
        <>
          <p className={styles.pgroupLabel}>Options</p>
          {q.options.map((opt, i) => (
            <div className={styles.editRow} key={i}>
              <div className={styles.editHead}>
                <span className={styles.optLabel}>{LETTERS[i]}</span>
                <input value={opt.text} onChange={(e) => onOptionChange(i, { text: e.target.value })} />
              </div>
              {opt.imageUrl ? (
                <div className={styles.diagramPreview}>
                  <img src={opt.imageUrl} alt={`Option ${LETTERS[i]}`} />
                  <Button type="button" size="sm" variant="ghost" onClick={() => onOptionChange(i, { imageUrl: undefined })}>
                    Remove image
                  </Button>
                </div>
              ) : (
                <PasteZone label={`an image for option ${LETTERS[i]}`} onImage={(imageUrl) => onOptionChange(i, { imageUrl })} />
              )}
            </div>
          ))}
        </>
      )}

      <div className={styles.navrow}>
        <Button type="button" size="sm" onClick={onDone}>
          Done editing
        </Button>
      </div>
    </>
  );
}

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

export default function PdfQuestionReview() {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [editing, setEditing] = useState(false);
  const [parseError, setParseError] = useState('');

  const [batch, setBatch] = useState({
    examType: EXAM_TRACKS[0].key,
    chapter: '',
    topic: '',
    difficulty: 'medium',
    author: '',
    subject: '',
    tags: '',
  });
  const [excelFile, setExcelFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [failed, setFailed] = useState(false);

  const handleJsonFile = async (file) => {
    setParseError('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(arr)) throw new Error('Expected a JSON array of questions (or a { "questions": [...] } object).');
      setQuestions(arr.map(normalizeQuestion));
      setCurrent(0);
      setEditing(false);
    } catch (err) {
      setParseError(err.message);
    }
  };

  const updateQuestion = (index, patch) => {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };
  const updateOption = (qIndex, optIndex, patch) => {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIndex) return q;
        return { ...q, options: q.options.map((o, j) => (j === optIndex ? { ...o, ...patch } : o)) };
      })
    );
  };

  const handlePublish = async () => {
    if (!excelFile || questions.length === 0) return;
    setBusy(true);
    setMessage('');
    setWarnings([]);
    setFailed(false);
    try {
      const payload = questions.map((q) => ({
        questionNumber: q.questionNumber,
        type: q.type,
        text: q.text,
        imageUrl: q.imageUrl,
        options: q.options.map((o) => ({ text: o.text, imageUrl: o.imageUrl })),
        chapter: q.chapter || undefined,
        topic: q.topic || undefined,
      }));
      const { questions: created, warnings: w } = await questionService.commitExtracted(payload, excelFile, batch);
      setMessage(`Added ${created.length} question${created.length === 1 ? '' : 's'} to the bank.`);
      setWarnings(w);
      setQuestions([]);
      setExcelFile(null);
    } catch (err) {
      setWarnings([err.message]);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const q = questions[current];
  const flaggedCount = questions.filter((x) => x.needsImage).length;
  const pastedCount = questions.filter((x) => x.needsImage && x.imageUrl).length;

  return (
    <>
      <SEO
        title="AI-Extracted Questions"
        description="Review and publish AI-extracted questions from a PDF."
        path="/dashboard/mentor/questions/upload/review"
      />
      <DashboardLayout role="mentor">
        <div className={`${formStyles.wrap} ${styles.wrap}`}>
          <h1>Review AI-Extracted Questions</h1>
          <p style={{ color: 'var(--ap-text-muted)' }}>
            Send your question paper's PDF to a Claude conversation and ask it to extract the questions as JSON —
            each question as text with inline <code>$...$</code> LaTeX, flagged for a diagram only when the layout
            genuinely needs one. Upload that JSON here with the same Excel answer-key sheet used elsewhere, paste in
            any flagged diagrams, then publish. Back to <Link to="/dashboard/mentor/questions/upload">other upload methods</Link>.
          </p>

          {questions.length === 0 ? (
            <div className={styles.uploadCard}>
              <label>
                Extracted questions (.json)
                <input type="file" accept=".json,application/json" onChange={(e) => e.target.files[0] && handleJsonFile(e.target.files[0])} />
              </label>
              {parseError && <p className={formStyles.errorMsg}>{parseError}</p>}
            </div>
          ) : (
            <>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{questions.length}</span>
                  <span className={styles.statLabel}>Questions loaded</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{questions.length - flaggedCount}</span>
                  <span className={styles.statLabel}>Text only</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{flaggedCount}</span>
                  <span className={styles.statLabel}>Flagged for diagram</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>
                    {pastedCount} / {flaggedCount}
                  </span>
                  <span className={styles.statLabel}>Diagrams pasted</span>
                </div>
              </div>

              <div className={styles.stage}>
                <aside className={styles.palette}>
                  <p className={styles.pgroupLabel}>Questions</p>
                  <div className={styles.pgrid}>
                    {questions.map((qq, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`${styles.chip} ${qq.needsImage ? styles.chipImg : ''} ${i === current ? styles.chipActive : ''}`}
                        onClick={() => {
                          setCurrent(i);
                          setEditing(false);
                        }}
                      >
                        {qq.needsImage && qq.imageUrl ? '✓' : qq.questionNumber}
                      </button>
                    ))}
                  </div>
                  <div className={styles.legend}>
                    <span>
                      <i className={styles.swatch} /> Text only
                    </span>
                    <span>
                      <i className={`${styles.swatch} ${styles.swatchImg}`} /> Needs a diagram
                    </span>
                  </div>
                </aside>

                <div className={styles.card}>
                  {editing ? (
                    <EditForm
                      q={q}
                      onChange={(patch) => updateQuestion(current, patch)}
                      onOptionChange={(i, patch) => updateOption(current, i, patch)}
                      onDone={() => setEditing(false)}
                    />
                  ) : (
                    <ViewCard
                      q={q}
                      index={current}
                      total={questions.length}
                      onPrev={() => setCurrent((c) => Math.max(0, c - 1))}
                      onNext={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                      onEdit={() => setEditing(true)}
                    />
                  )}
                </div>
              </div>

              <div className={styles.uploadCard} style={{ marginTop: '1rem' }}>
                <strong>Batch defaults &amp; publish</strong>
                <div className={formStyles.form}>
                  <div className={formStyles.row}>
                    <label>
                      Exam type (fallback)
                      <select value={batch.examType} onChange={(e) => setBatch((f) => ({ ...f, examType: e.target.value }))}>
                        <option value="">None</option>
                        {EXAM_TRACKS.map((t) => (
                          <option key={t.key} value={t.key}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Difficulty (fallback)
                      <select value={batch.difficulty} onChange={(e) => setBatch((f) => ({ ...f, difficulty: e.target.value }))}>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </label>
                  </div>
                  <div className={formStyles.row}>
                    <label>
                      Chapter (fallback)
                      <input value={batch.chapter} onChange={(e) => setBatch((f) => ({ ...f, chapter: e.target.value }))} />
                    </label>
                    <label>
                      Topic (fallback)
                      <input value={batch.topic} onChange={(e) => setBatch((f) => ({ ...f, topic: e.target.value }))} />
                    </label>
                  </div>
                  <div className={formStyles.row}>
                    <label>
                      Author / Source (fallback)
                      <input value={batch.author} onChange={(e) => setBatch((f) => ({ ...f, author: e.target.value }))} />
                    </label>
                    <label>
                      Subject (fallback)
                      <input value={batch.subject} onChange={(e) => setBatch((f) => ({ ...f, subject: e.target.value }))} />
                    </label>
                  </div>
                  <label>
                    Tags (comma-separated, fallback)
                    <input value={batch.tags} onChange={(e) => setBatch((f) => ({ ...f, tags: e.target.value }))} />
                  </label>
                  <label>
                    Excel sheet (mapping — answers, marks, concept codes, etc.)
                    <input type="file" accept=".xlsx,.xls" onChange={(e) => setExcelFile(e.target.files[0])} />
                  </label>
                  <div className={formStyles.actions}>
                    <Button type="button" disabled={!excelFile || busy} onClick={handlePublish}>
                      {busy ? 'Publishing…' : `Publish all ${questions.length} question${questions.length === 1 ? '' : 's'}`}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        setQuestions([]);
                        setExcelFile(null);
                      }}
                    >
                      Start over
                    </Button>
                  </div>
                  <UploadFeedback message={message} warnings={warnings} failed={failed} />
                </div>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
