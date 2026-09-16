import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { courseService } from '../../services/courseService.js';
import { useAuth } from '../../hooks/useAuth.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import { assetUrl } from '../../data/assetUrl.js';
import formStyles from './DashboardForm.module.css';
import styles from './CourseEditor.module.css';
import VideoManager from '../../components/dashboard/VideoManager.jsx';

const emptyForm = {
  slug: '',
  title: '',
  track: EXAM_TRACKS[0].key,
  tagline: '',
  description: '',
  courseType: 'recorded',
  feeType: 'one-time',
  price: '',
  strikePrice: '',
  monthlyFee: '',
  currency: 'INR',
  durationWeeks: '',
  level: 'Intermediate',
  highlightsText: '',
  examLogoKey: '',
  isFeatured: false,
  status: 'open',
  visibility: 'public',
};

function courseToForm(course) {
  return {
    slug: course.slug,
    title: course.title,
    track: course.track,
    tagline: course.tagline,
    description: course.description,
    courseType: course.courseType === 'live' ? 'live' : 'recorded',
    feeType: course.feeType === 'monthly' ? 'monthly' : 'one-time',
    price: course.price,
    strikePrice: course.strikePrice ?? '',
    monthlyFee: course.monthlyFee ?? '',
    currency: course.currency || 'INR',
    durationWeeks: course.durationWeeks,
    level: course.level,
    highlightsText: (course.highlights || []).join('\n'),
    examLogoKey: course.examLogoKey || '',
    isFeatured: course.isFeatured,
    status: course.status,
    visibility: course.visibility === 'private' ? 'private' : 'public',
  };
}

export default function CourseEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [form, setForm] = useState(emptyForm);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loadingCourse, setLoadingCourse] = useState(isEdit);
  const [status, setStatus] = useState('idle'); // idle | submitting | error
  const [error, setError] = useState('');
  const [notAssigned, setNotAssigned] = useState(false);

  const isAssigned = (course) =>
    user?.courseAccessMode !== 'selected' || user.assignedCourseIds?.includes(course._id);

  useEffect(() => {
    if (!isEdit) return;

    const stateCourse = location.state?.course;
    if (stateCourse) {
      if (!isAssigned(stateCourse)) {
        setNotAssigned(true);
        setLoadingCourse(false);
        return;
      }
      setForm(courseToForm(stateCourse));
      setCurrentImageUrl(stateCourse.imageUrl);
      setLoadingCourse(false);
      return;
    }

    courseService.getAllForMentor().then((courses) => {
      const match = courses.find((c) => c._id === id);
      if (match) {
        setForm(courseToForm(match));
        setCurrentImageUrl(match.imageUrl);
      } else {
        setError('Course not found.');
      }
      setLoadingCourse(false);
    });
  }, [id, isEdit, location.state]);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    setError('');

    const payload = {
      slug: form.slug,
      title: form.title,
      track: form.track,
      tagline: form.tagline,
      description: form.description,
      courseType: form.courseType,
      feeType: form.feeType,
      // `price` stays a required top-level number in the schema regardless
      // of feeType/courseType (a monthly or live course just doesn't display
      // it) — 0 keeps those from needing a meaningless one-time price typed in.
      price: form.courseType === 'live' || form.feeType === 'monthly' ? 0 : Number(form.price),
      strikePrice:
        form.courseType === 'live' || form.feeType === 'monthly' || form.strikePrice === '' ? undefined : Number(form.strikePrice),
      monthlyFee: form.courseType === 'recorded' && form.feeType === 'monthly' ? Number(form.monthlyFee) || 0 : undefined,
      currency: form.currency,
      durationWeeks: Number(form.durationWeeks),
      level: form.level,
      highlights: form.highlightsText
        .split('\n')
        .map((h) => h.trim())
        .filter(Boolean),
      examLogoKey: form.examLogoKey || undefined,
      isFeatured: form.isFeatured,
      status: form.status,
      visibility: form.visibility,
    };

    try {
      const course = isEdit ? await courseService.update(id, payload) : await courseService.create(payload);
      if (imageFile) {
        await courseService.uploadImage(course._id, imageFile);
      }
      navigate('/dashboard/mentor');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  if (loadingCourse) return <Spinner label="Loading course…" />;

  if (notAssigned) {
    return (
      <>
        <SEO title="Edit Course" description="Manage course details." path="/dashboard/mentor" />
        <DashboardLayout role="mentor">
          <div className={formStyles.wrap}>
            <h1>Edit Course</h1>
            <ErrorState message="You don't have access to this course. Ask an admin to assign it to you." />
          </div>
        </DashboardLayout>
      </>
    );
  }

  return (
    <>
      <SEO title={isEdit ? 'Edit Course' : 'New Course'} description="Manage course details." path="/dashboard/mentor" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap}>
          <h1>{isEdit ? 'Edit Course' : 'Add New Course'}</h1>

            <form className={formStyles.form} onSubmit={handleSubmit}>
              <div className={formStyles.row}>
                <label>
                  Title
                  <input name="title" required value={form.title} onChange={handleChange} />
                </label>
                <label>
                  Slug
                  <input
                    name="slug"
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    title="Lowercase letters, numbers, and hyphens only (e.g. neet-physics-2027)"
                    value={form.slug}
                    onChange={handleChange}
                  />
                </label>
              </div>

              <label>
                Tagline
                <input name="tagline" required value={form.tagline} onChange={handleChange} />
              </label>

              <label>
                Description
                <textarea name="description" rows="4" required value={form.description} onChange={handleChange} />
              </label>

              <div className={formStyles.row}>
                <label>
                  Course Type
                  <select name="courseType" value={form.courseType} onChange={handleChange}>
                    <option value="recorded">Recorded</option>
                    <option value="live">Live</option>
                  </select>
                </label>
                <label>
                  Track
                  <select name="track" value={form.track} onChange={handleChange}>
                    {EXAM_TRACKS.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={formStyles.row}>
                <label>
                  Level
                  <select name="level" value={form.level} onChange={handleChange}>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </label>
              </div>

              {form.courseType === 'live' ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)' }}>
                  Live courses don't show a public price. A mentor/admin negotiates the fee and security deposit with each
                  student individually at registration.
                </p>
              ) : (
                <>
                  <div className={formStyles.row}>
                    <label>
                      Pricing type
                      <select name="feeType" value={form.feeType} onChange={handleChange}>
                        <option value="one-time">One-time</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </label>
                    {form.feeType === 'monthly' ? (
                      <label>
                        Monthly Fee (₹)
                        <input type="number" name="monthlyFee" required min="0" value={form.monthlyFee} onChange={handleChange} />
                      </label>
                    ) : (
                      <label>
                        Price (₹)
                        <input type="number" name="price" required min="0" value={form.price} onChange={handleChange} />
                      </label>
                    )}
                  </div>

                  {form.feeType === 'one-time' && (
                    <div className={formStyles.row}>
                      <label>
                        Strike Price (optional)
                        <input type="number" name="strikePrice" min="0" value={form.strikePrice} onChange={handleChange} />
                      </label>
                    </div>
                  )}
                </>
              )}

              <div className={formStyles.row}>
                <label>
                  Duration (weeks)
                  <input
                    type="number"
                    name="durationWeeks"
                    required
                    min="1"
                    value={form.durationWeeks}
                    onChange={handleChange}
                  />
                </label>
                <label>
                  Status
                  <select name="status" value={form.status} onChange={handleChange}>
                    <option value="open">Open</option>
                    <option value="launching-soon">Launching Soon</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
              </div>

              <div className={formStyles.row}>
                <label>
                  Visibility
                  <select name="visibility" value={form.visibility} onChange={handleChange}>
                    <option value="public">Public (listed)</option>
                    <option value="private">Private (hidden, not listed)</option>
                  </select>
                </label>
              </div>

              <label>
                Highlights (one per line)
                <textarea name="highlightsText" rows="4" value={form.highlightsText} onChange={handleChange} />
              </label>

              <label className={formStyles.checkboxLabel}>
                <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} />
                Feature on homepage
              </label>

              <label>
                Course Image
                {currentImageUrl && !imageFile && (
                  <img src={assetUrl(currentImageUrl)} alt="" className={styles.preview} />
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImageFile(e.target.files[0])} />
              </label>

              <div className={formStyles.actions}>
                <Button type="submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Course'}
                </Button>
                <Button as={Link} to="/dashboard/mentor" variant="ghost">
                  Cancel
                </Button>
              </div>

              {status === 'error' && <p className={formStyles.errorMsg}>{error}</p>}
            </form>

            {isEdit && (
              <div style={{ marginTop: 'var(--ap-space-lg)' }}>
                <VideoManager courseId={id} />
              </div>
            )}
        </div>
      </DashboardLayout>
    </>
  );
}
