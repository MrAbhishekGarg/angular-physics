import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import Container from '../../components/common/Container.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { courseService } from '../../services/courseService.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import { assetUrl } from '../../data/assetUrl.js';
import styles from './CourseEditor.module.css';

const emptyForm = {
  slug: '',
  title: '',
  track: EXAM_TRACKS[0].key,
  tagline: '',
  description: '',
  price: '',
  strikePrice: '',
  currency: 'INR',
  durationWeeks: '',
  level: 'Intermediate',
  highlightsText: '',
  examLogoKey: '',
  isFeatured: false,
  status: 'open',
};

function courseToForm(course) {
  return {
    slug: course.slug,
    title: course.title,
    track: course.track,
    tagline: course.tagline,
    description: course.description,
    price: course.price,
    strikePrice: course.strikePrice ?? '',
    currency: course.currency || 'INR',
    durationWeeks: course.durationWeeks,
    level: course.level,
    highlightsText: (course.highlights || []).join('\n'),
    examLogoKey: course.examLogoKey || '',
    isFeatured: course.isFeatured,
    status: course.status,
  };
}

export default function CourseEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState(emptyForm);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loadingCourse, setLoadingCourse] = useState(isEdit);
  const [status, setStatus] = useState('idle'); // idle | submitting | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;

    const stateCourse = location.state?.course;
    if (stateCourse) {
      setForm(courseToForm(stateCourse));
      setCurrentImageUrl(stateCourse.imageUrl);
      setLoadingCourse(false);
      return;
    }

    courseService.getAll().then((courses) => {
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
      price: Number(form.price),
      strikePrice: form.strikePrice === '' ? undefined : Number(form.strikePrice),
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

  return (
    <>
      <SEO title={isEdit ? 'Edit Course' : 'New Course'} description="Manage course details." path="/dashboard/mentor" />
      <main>
        <Container>
          <div className={styles.wrap}>
            <Link to="/dashboard/mentor">← Back to dashboard</Link>
            <h1>{isEdit ? 'Edit Course' : 'Add New Course'}</h1>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.row}>
                <label>
                  Title
                  <input name="title" required value={form.title} onChange={handleChange} />
                </label>
                <label>
                  Slug
                  <input name="slug" required value={form.slug} onChange={handleChange} />
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

              <div className={styles.row}>
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
                <label>
                  Level
                  <select name="level" value={form.level} onChange={handleChange}>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </label>
              </div>

              <div className={styles.row}>
                <label>
                  Price (₹)
                  <input type="number" name="price" required min="0" value={form.price} onChange={handleChange} />
                </label>
                <label>
                  Strike Price (optional)
                  <input type="number" name="strikePrice" min="0" value={form.strikePrice} onChange={handleChange} />
                </label>
              </div>

              <div className={styles.row}>
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

              <label>
                Highlights (one per line)
                <textarea name="highlightsText" rows="4" value={form.highlightsText} onChange={handleChange} />
              </label>

              <label className={styles.checkboxLabel}>
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

              <div className={styles.actions}>
                <Button type="submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Course'}
                </Button>
                <Button as={Link} to="/dashboard/mentor" variant="ghost">
                  Cancel
                </Button>
              </div>

              {status === 'error' && <p className={styles.errorMsg}>{error}</p>}
            </form>
          </div>
        </Container>
      </main>
    </>
  );
}
