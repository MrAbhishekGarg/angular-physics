import { useState } from 'react';
import Button from '../common/Button.jsx';
import { questionService } from '../../services/questionService.js';
import { assetUrl } from '../../data/assetUrl.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import formStyles from '../../pages/dashboard/DashboardForm.module.css';

const TYPE_LABELS = {
  'mcq-single': 'Single-answer MCQ',
  'mcq-multiple': 'Multi-answer MCQ',
  numerical: 'Numerical answer',
};

const ALL_TYPES = ['mcq-single', 'mcq-multiple', 'numerical'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

export const emptyQuestion = (examType) => ({
  type: 'mcq-single',
  text: '',
  options: [{ text: '', imageUrl: undefined }, { text: '', imageUrl: undefined }, { text: '', imageUrl: undefined }, { text: '', imageUrl: undefined }],
  correctOptionIndexes: [],
  correctNumericAnswer: undefined,
  numericTolerance: 0,
  marks: 4,
  negativeMarks: 1,
  // A question can be tagged to several exams, exactly one, or none at all
  // ("unmapped") — an empty array here is a valid, deliberate default, not
  // a placeholder waiting to be filled in.
  examTypes: examType ? [examType] : [],
  subject: '',
  chapter: '',
  topic: '',
  difficulty: 'medium',
  isPYQ: false,
  pyqYear: '',
  author: '',
  tags: [],
  conceptCodes: [],
});

/**
 * A single bank question — create or edit — persisted directly against
 * /api/questions rather than mutating a parent's local array state, so
 * every question authored here immediately becomes reusable across any
 * test or practice set, not just the one being built when it was written.
 */
export default function QuestionEditor({ initialQuestion, examType: defaultExamType, onSaved, onCancel, onDeleted }) {
  const isEdit = Boolean(initialQuestion?._id);
  const [question, setQuestion] = useState(() => initialQuestion || emptyQuestion(defaultExamType));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Kept as raw text, separate from question.tags (the derived array) — if
  // this input were bound to tags.join(', ') directly, typing a trailing
  // "Tricky, " would get its comma silently stripped by the split/filter
  // round-trip on every keystroke, fighting the user mid-edit.
  const [tagsText, setTagsText] = useState(() => (initialQuestion?.tags || []).join(', '));
  // Same raw-text-vs-derived-array split as tagsText, and for the same reason.
  const [conceptCodesText, setConceptCodesText] = useState(() => (initialQuestion?.conceptCodes || []).join(', '));

  const isUnconventionalForNeet = question.examTypes?.includes('neet') && question.type !== 'mcq-single';
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');

  const update = (patch) => setQuestion((q) => ({ ...q, ...patch }));

  const uploadImageFile = async (file) => {
    if (!file) return;
    setImageBusy(true);
    setImageError('');
    try {
      const { imageUrl } = await questionService.uploadImage(file);
      update({ imageUrl });
    } catch (err) {
      setImageError(err.message);
    } finally {
      setImageBusy(false);
    }
  };

  const updateOption = (optIndex, patch) => {
    const options = [...question.options];
    options[optIndex] = { ...options[optIndex], ...patch };
    update({ options });
  };

  const addOption = () => update({ options: [...question.options, { text: '', imageUrl: undefined }] });

  const removeOption = (optIndex) => {
    const options = question.options.filter((_, i) => i !== optIndex);
    const correctOptionIndexes = question.correctOptionIndexes
      .filter((i) => i !== optIndex)
      .map((i) => (i > optIndex ? i - 1 : i));
    update({ options, correctOptionIndexes });
  };

  const toggleCorrect = (optIndex) => {
    const isSingle = question.type === 'mcq-single';
    if (isSingle) {
      update({ correctOptionIndexes: [optIndex] });
      return;
    }
    const has = question.correctOptionIndexes.includes(optIndex);
    update({
      correctOptionIndexes: has
        ? question.correctOptionIndexes.filter((i) => i !== optIndex)
        : [...question.correctOptionIndexes, optIndex],
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...question,
        pyqYear: question.isPYQ && question.pyqYear ? Number(question.pyqYear) : undefined,
      };
      const saved = isEdit ? await questionService.update(question._id, payload) : await questionService.create(payload);
      onSaved?.(saved);
      if (!isEdit) {
        setQuestion(emptyQuestion(question.examTypes[0]));
        setTagsText('');
        setConceptCodesText('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this question from the bank? Tests that reference it will just skip it.')) return;
    await questionService.remove(question._id);
    onDeleted?.(question._id);
  };

  return (
    <div className={formStyles.card}>
      <div className={formStyles.cardHeader}>
        <strong>{isEdit ? 'Edit Question' : 'New Question'}</strong>
        {isEdit && (
          <Button type="button" size="sm" variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        )}
      </div>

      <div className={formStyles.form}>
        <div>
          <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            Exam type(s) — leave all unchecked to keep this question unmapped
          </span>
          <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
            {EXAM_TRACKS.map((t) => (
              <label key={t.key} className={formStyles.checkboxLabel} style={{ fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={question.examTypes.includes(t.key)}
                  onChange={() =>
                    update({
                      examTypes: question.examTypes.includes(t.key)
                        ? question.examTypes.filter((k) => k !== t.key)
                        : [...question.examTypes, t.key],
                    })
                  }
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        <div className={formStyles.row}>
          <label>
            Type
            <select
              value={question.type}
              onChange={(e) =>
                update({ type: e.target.value, correctOptionIndexes: [], options: e.target.value === 'numerical' ? [] : question.options })
              }
            >
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            {isUnconventionalForNeet && (
              <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--ap-warning)' }}>
                NEET tests conventionally use single-answer MCQs only.
              </span>
            )}
          </label>
          <label>
            Subject (optional)
            <input value={question.subject} onChange={(e) => update({ subject: e.target.value })} placeholder="e.g. Physics" />
          </label>
        </div>

        <div className={formStyles.row}>
          <label>
            Chapter
            <input value={question.chapter} onChange={(e) => update({ chapter: e.target.value })} placeholder="e.g. Current Electricity" />
          </label>
          <label>
            Topic
            <input value={question.topic} onChange={(e) => update({ topic: e.target.value })} placeholder="e.g. Resistivity" />
          </label>
        </div>

        <label>
          Concept Codes (comma-separated, optional)
          <input
            value={conceptCodesText}
            onChange={(e) => {
              setConceptCodesText(e.target.value);
              update({ conceptCodes: e.target.value.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean) });
            }}
            placeholder="e.g. PHY-ELEC-045, PHY-MAG-012"
          />
        </label>

        <div className={formStyles.row}>
          <label>
            Difficulty
            <select value={question.difficulty} onChange={(e) => update({ difficulty: e.target.value })}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            Marks / Negative marks
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="number"
                value={question.marks}
                onChange={(e) => update({ marks: Number(e.target.value) })}
                style={{ width: '50%' }}
              />
              <input
                type="number"
                value={question.negativeMarks}
                onChange={(e) => update({ negativeMarks: Number(e.target.value) })}
                style={{ width: '50%' }}
              />
            </div>
          </label>
        </div>

        <div className={formStyles.row}>
          <label>
            Author / Source (optional)
            <input
              value={question.author}
              onChange={(e) => update({ author: e.target.value })}
              placeholder="e.g. Abhishek Garg, NCERT, Allen DPP"
            />
          </label>
          <label>
            Tags (comma-separated, optional)
            <input
              value={tagsText}
              onChange={(e) => {
                setTagsText(e.target.value);
                update({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) });
              }}
              placeholder="e.g. Tricky, Revision"
            />
          </label>
        </div>

        <div className={formStyles.row}>
          <label className={formStyles.checkboxLabel}>
            <input
              type="checkbox"
              checked={question.isPYQ}
              onChange={(e) => update({ isPYQ: e.target.checked, pyqYear: e.target.checked ? question.pyqYear : '' })}
            />
            Previous Year Question (PYQ)
          </label>
          {question.isPYQ && (
            <label>
              Year
              <input
                type="number"
                value={question.pyqYear}
                onChange={(e) => update({ pyqYear: e.target.value })}
                placeholder="e.g. 2023"
              />
            </label>
          )}
        </div>

        <label>
          Question text
          <textarea rows="2" value={question.text} onChange={(e) => update({ text: e.target.value })} />
        </label>

        <div>
          <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            Diagram / equation image (optional)
          </span>
          {question.imageUrl && (
            <div style={{ marginBottom: '0.5rem' }}>
              <img
                src={assetUrl(question.imageUrl)}
                alt=""
                style={{ maxWidth: 200, maxHeight: 120, display: 'block', border: '1px solid var(--ap-border)', borderRadius: 6 }}
              />
              <Button type="button" size="sm" variant="ghost" onClick={() => update({ imageUrl: undefined })}>
                Remove image
              </Button>
            </div>
          )}
          <PasteImageZone onFile={uploadImageFile} busy={imageBusy} error={imageError} />
        </div>

        {question.type === 'numerical' ? (
          <div className={formStyles.row}>
            <label>
              Correct answer
              <input
                type="number"
                value={question.correctNumericAnswer ?? ''}
                onChange={(e) => update({ correctNumericAnswer: Number(e.target.value) })}
              />
            </label>
            <label>
              Tolerance (±)
              <input
                type="number"
                value={question.numericTolerance ?? 0}
                onChange={(e) => update({ numericTolerance: Number(e.target.value) })}
              />
            </label>
          </div>
        ) : (
          <div>
            <label style={{ marginBottom: '0.35rem', display: 'block', fontSize: '0.9rem', fontWeight: 600 }}>
              Options ({question.type === 'mcq-single' ? 'select the one correct answer' : 'select all correct answers'})
            </label>
            {question.options.map((opt, optIndex) => (
              <OptionRow
                key={optIndex}
                option={opt}
                checked={question.correctOptionIndexes.includes(optIndex)}
                inputType={question.type === 'mcq-single' ? 'radio' : 'checkbox'}
                name="correct-option"
                onToggleCorrect={() => toggleCorrect(optIndex)}
                onChange={(patch) => updateOption(optIndex, patch)}
                onRemove={() => removeOption(optIndex)}
                placeholder={`Option ${optIndex + 1}`}
              />
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={addOption}>
              + Add option
            </Button>
          </div>
        )}

        <div className={formStyles.actions}>
          <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add to Bank'}
          </Button>
          {onCancel && (
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
        {error && <p className={formStyles.errorMsg}>{error}</p>}
      </div>
    </div>
  );
}

function OptionRow({ option, checked, inputType, name, onToggleCorrect, onChange, onRemove, placeholder }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const uploadFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { imageUrl } = await questionService.uploadImage(file);
      onChange({ imageUrl });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
      <input type={inputType} name={name} checked={checked} onChange={onToggleCorrect} style={{ marginTop: '0.6rem' }} />
      <div style={{ flex: 1 }}>
        {option.imageUrl ? (
          <div style={{ marginBottom: '0.3rem' }}>
            <img
              src={assetUrl(option.imageUrl)}
              alt=""
              style={{ maxWidth: 160, maxHeight: 80, display: 'block', border: '1px solid var(--ap-border)', borderRadius: 6 }}
            />
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ imageUrl: undefined })}>
              Remove image
            </Button>
          </div>
        ) : (
          <input
            value={option.text}
            onChange={(e) => onChange({ text: e.target.value })}
            style={{ width: '100%', marginBottom: '0.3rem' }}
            placeholder={placeholder}
          />
        )}
        <PasteImageZone onFile={uploadFile} busy={busy} error={error} compact />
      </div>
      <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
        ✕
      </Button>
    </div>
  );
}

/**
 * Lets a mentor either paste a screenshot straight from the clipboard
 * (Ctrl+V after copying a cropped equation/diagram/table screenshot) or fall
 * back to a traditional file picker — both land on the same upload path, so
 * the resulting image is stored at whatever resolution the mentor's own
 * screenshot/file already has (no server-side resize/compression happens),
 * which is what keeps it clear: crop tightly before copying/choosing it.
 */
function PasteImageZone({ onFile, busy, error, compact }) {
  const [pasteHint, setPasteHint] = useState('');

  const handlePaste = (e) => {
    const items = e.clipboardData?.items || [];
    const imageItem = [...items].find((item) => item.type.startsWith('image/'));
    if (imageItem) {
      e.preventDefault();
      setPasteHint('');
      onFile(imageItem.getAsFile());
    } else {
      setPasteHint('No image found in clipboard — copy a screenshot first, then click here and paste again.');
    }
  };

  return (
    <div>
      <div
        tabIndex={0}
        onPaste={handlePaste}
        onFocus={() => setPasteHint('')}
        style={{
          border: '1.5px dashed var(--ap-border)',
          borderRadius: 6,
          padding: compact ? '0.35rem 0.5rem' : '0.5rem 0.6rem',
          fontSize: compact ? '0.72rem' : '0.78rem',
          color: 'var(--ap-text-muted)',
          marginBottom: '0.3rem',
          cursor: 'text',
        }}
      >
        Click here, then press Ctrl+V to paste a screenshot — crop it tightly around just this content first for the clearest result.
      </div>
      {pasteHint && <p style={{ fontSize: '0.75rem', color: 'var(--ap-warning)', marginBottom: '0.3rem' }}>{pasteHint}</p>}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
      {busy && <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}> Uploading…</span>}
      {error && <p className={formStyles.errorMsg}>{error}</p>}
    </div>
  );
}
