import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { testService } from '../../services/testService.js';
import { practiceService } from '../../services/practiceService.js';
import { useAuth } from '../../hooks/useAuth.js';
import { getTrackMeta } from '../../data/examTracks.js';
import formStyles from './DashboardForm.module.css';
import styles from './PracticeGenerator.module.css';

const DEFAULT_SET_SIZE = 10;

export default function PracticeGenerator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [busyCategory, setBusyCategory] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    practiceService.getMyProfile().then(setProfile).catch(() => {});
    practiceService.getCategories().then(setCategories).catch(() => {});
  }, []);

  const handleCategoryClick = async (category) => {
    setBusyCategory(category.key);
    setError('');
    try {
      const { test } = await testService.startPractice({
        examType: user.track,
        categoryKey: category.key,
        count: DEFAULT_SET_SIZE,
      });
      navigate(`/dashboard/student/practice/session/${test._id}`);
    } catch (err) {
      setError(err.message);
      setBusyCategory('');
    }
  };

  const level = profile?.levelInfo;
  const trackMeta = getTrackMeta(user?.track);

  return (
    <>
      <SEO title="Practice Room" description="Gamified, topic-wise physics practice." path="/dashboard/student/practice" />
      <DashboardLayout role="student">
        <div className={formStyles.wrap}>
          <h1>🎮 Practice Room</h1>
          <p style={{ color: 'var(--ap-text-muted)' }}>
            Untimed, unproctored practice for {trackMeta ? `${trackMeta.icon} ${trackMeta.label}` : 'your track'} — pick a category
            below and jump straight in. New categories and questions are added by your mentors as fresh content comes in.
          </p>

          {!user?.track && (
            <p className={styles.trackWarning}>
              Set your exam track in <Link to="/dashboard/student/profile">My Profile</Link> before practicing.
            </p>
          )}

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

          <h2 className={styles.categoriesHeading}>Pick a Category</h2>
          <div className={styles.categoryGrid}>
            {categories.map((c) => (
              <button
                type="button"
                key={c.key}
                className={styles.categoryCard}
                disabled={busyCategory !== '' || !user?.track}
                onClick={() => handleCategoryClick(c)}
              >
                <span className={styles.categoryIcon}>{c.icon}</span>
                <strong>{c.label}</strong>
                <span className={styles.categoryDesc}>{c.description}</span>
                {busyCategory === c.key && <Spinner label="Starting…" />}
              </button>
            ))}
          </div>

          {error && <p className={formStyles.errorMsg}>{error}</p>}
        </div>
      </DashboardLayout>
    </>
  );
}
