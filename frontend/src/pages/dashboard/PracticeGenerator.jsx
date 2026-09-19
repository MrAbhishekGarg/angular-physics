import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { testService } from '../../services/testService.js';
import { practiceService } from '../../services/practiceService.js';
import { useQuestionTaxonomy } from '../../hooks/useQuestions.js';
import { useAuth } from '../../hooks/useAuth.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import formStyles from './DashboardForm.module.css';
import styles from './PracticeGenerator.module.css';

export default function PracticeGenerator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busyCategory, setBusyCategory] = useState('');
  const [form, setForm] = useState({
    examType: user?.track || EXAM_TRACKS[0].key,
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

  useEffect(() => {
    practiceService.getMyProfile().then(setProfile).catch(() => {});
    practiceService.getCategories().then(setCategories).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const startPractice = async (payload, busySetter) => {
    busySetter(true);
    setError('');
    try {
      const { test } = await testService.startPractice(payload);
      navigate(`/dashboard/student/tests/${test._id}`);
    } catch (err) {
      setError(err.message);
      busySetter(false);
    }
  };

  const handleCategoryClick = (category) => {
    setBusyCategory(category.key);
    startPractice(
      { examType: form.examType, count: 10, ...category.filters },
      () => setBusyCategory('')
    );
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    startPractice(
      {
        examType: form.examType,
        chapter: form.chapter || undefined,
        topic: form.topic || undefined,
        difficulty: form.difficulty || undefined,
        isPYQ: form.isPYQ || undefined,
        year: form.isPYQ && form.year ? form.year : undefined,
        count: Number(form.count),
      },
      setBusy
    );
  };

  const level = profile?.levelInfo;

  return (
    <>
      <SEO title="Practice Room" description="Gamified, chapter and topic-wise physics practice." path="/dashboard/student/practice" />
      <DashboardLayout role="student">
        <div className={formStyles.wrap}>
          <h1>🎮 Practice Room</h1>
          <p style={{ color: 'var(--ap-text-muted)' }}>
            Untimed, unproctored practice — pick a category below and jump straight in, or build a custom set.
          </p>

          {profile && (
            <div className={styles.statsBar}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>Lv {level.level}</span>
                <span className={styles.statLabel}>Level</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{profile.xp}</span>
                <span className={styles.statLabel}>Total XP</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>🔥 {profile.currentStreak}</span>
                <span className={styles.statLabel}>Day Streak</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{profile.totalSessionsCompleted}</span>
                <span className={styles.statLabel}>Sessions Done</span>
              </div>
              <div className={styles.xpBarWrap}>
                <div className={styles.xpBarTrack}>
                  <div className={styles.xpBarFill} style={{ width: `${(level.xpIntoLevel / level.xpForNextLevel) * 100}%` }} />
                </div>
                <span className={styles.xpBarLabel}>
                  {level.xpIntoLevel} / {level.xpForNextLevel} XP to Level {level.level + 1}
                </span>
              </div>
            </div>
          )}

          <div className={formStyles.row} style={{ marginTop: 'var(--ap-space-md)' }}>
            <label style={{ maxWidth: 260 }}>
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

          <h2 className={styles.categoriesHeading}>Pick a Category</h2>
          <div className={styles.categoryGrid}>
            {categories.map((c) => (
              <button
                type="button"
                key={c.key}
                className={styles.categoryCard}
                disabled={busyCategory !== ''}
                onClick={() => handleCategoryClick(c)}
              >
                <span className={styles.categoryIcon}>{c.icon}</span>
                <strong>{c.label}</strong>
                <span className={styles.categoryDesc}>{c.description}</span>
                {busyCategory === c.key && <Spinner label="Starting…" />}
              </button>
            ))}
          </div>

          <Button type="button" variant="ghost" onClick={() => setShowAdvanced((v) => !v)} style={{ margin: 'var(--ap-space-md) 0' }}>
            {showAdvanced ? '− Hide Custom Practice' : '+ Build Custom Practice Set'}
          </Button>

          {showAdvanced && (
            <form className={formStyles.form} onSubmit={handleGenerate}>
              <div className={formStyles.row}>
                <label>
                  Difficulty
                  <select name="difficulty" value={form.difficulty} onChange={handleChange}>
                    <option value="">Any</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
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
              </div>

              <div className={formStyles.row}>
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
                  />
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

              <div className={formStyles.actions}>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Generating…' : 'Generate Practice Test'}
                </Button>
              </div>
            </form>
          )}

          {error && <p className={formStyles.errorMsg}>{error}</p>}
        </div>
      </DashboardLayout>
    </>
  );
}
