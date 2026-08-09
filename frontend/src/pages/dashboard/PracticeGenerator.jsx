import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import { testService } from '../../services/testService.js';
import { useQuestionTaxonomy } from '../../hooks/useQuestions.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import formStyles from './DashboardForm.module.css';

export default function PracticeGenerator() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    examType: EXAM_TRACKS[0].key,
    chapter: '',
    topic: '',
    difficulty: '',
    isPYQ: false,
    year: '',
    count: 10,
  });
  const { data: taxonomy } = useQuestionTaxonomy(form.examType);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { test } = await testService.startPractice({
        examType: form.examType,
        chapter: form.chapter || undefined,
        topic: form.topic || undefined,
        difficulty: form.difficulty || undefined,
        isPYQ: form.isPYQ || undefined,
        year: form.isPYQ && form.year ? form.year : undefined,
        count: Number(form.count),
      });
      navigate(`/dashboard/student/tests/${test._id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <SEO title="Practice by Topic" description="Generate a topic or chapter-wise practice test." path="/dashboard/student/practice" />
      <DashboardLayout role="student">
        <div className={formStyles.wrap}>
          <h1>Practice by Topic</h1>
            <p style={{ color: 'var(--ap-text-muted)' }}>
              Pick a chapter or topic and we'll pull a fresh set of questions from the bank for you — untimed
              pressure, no proctoring, just practice. Tick "Previous Year Questions only" for free PYQ practice —
              topic-wise, chapter-wise, year-wise, or fully random, all free.
            </p>

            <form className={formStyles.form} onSubmit={handleGenerate}>
              <div className={formStyles.row}>
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
                <label>
                  Difficulty
                  <select name="difficulty" value={form.difficulty} onChange={handleChange}>
                    <option value="">Any</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
              </div>

              <div className={formStyles.row}>
                <label>
                  Chapter
                  <select name="chapter" value={form.chapter} onChange={handleChange}>
                    <option value="">Any chapter</option>
                    {(taxonomy?.chapters || []).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Topic
                  <select name="topic" value={form.topic} onChange={handleChange}>
                    <option value="">Any topic</option>
                    {(taxonomy?.topics || []).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={formStyles.row}>
                <label className={formStyles.checkboxLabel}>
                  <input type="checkbox" name="isPYQ" checked={form.isPYQ} onChange={handleChange} />
                  Previous Year Questions only
                </label>
                {form.isPYQ && (
                  <label>
                    Year
                    <select name="year" value={form.year} onChange={handleChange}>
                      <option value="">Any year</option>
                      {(taxonomy?.pyqYears || []).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <label>
                Number of questions
                <input
                  type="number"
                  name="count"
                  min="1"
                  max="50"
                  required
                  value={form.count}
                  onChange={handleChange}
                  style={{ maxWidth: 120 }}
                />
              </label>

              <div className={formStyles.actions}>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Generating…' : 'Generate Practice Test'}
                </Button>
              </div>

              {error && <p className={formStyles.errorMsg}>{error}</p>}
            </form>
        </div>
      </DashboardLayout>
    </>
  );
}
