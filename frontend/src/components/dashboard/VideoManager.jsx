import { useState } from 'react';
import Button from '../common/Button.jsx';
import Badge from '../common/Badge.jsx';
import Spinner from '../common/Spinner.jsx';
import { useVideosForCourse } from '../../hooks/useVideos.js';
import { videoService } from '../../services/videoService.js';
import formStyles from '../../pages/dashboard/DashboardForm.module.css';

const emptyForm = { title: '', description: '', order: 0, source: 'upload', youtubeVideoId: '' };

export default function VideoManager({ courseId }) {
  const { data: videos, loading, refetch } = useVideosForCourse(courseId);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        courseId,
        title: form.title,
        description: form.description,
        order: Number(form.order) || 0,
        source: form.source,
      };
      if (form.source === 'youtube') payload.youtubeVideoId = form.youtubeVideoId;

      const video = await videoService.create(payload);
      if (form.source === 'upload' && file) {
        await videoService.uploadFile(video._id, file);
      }
      setForm(emptyForm);
      setFile(null);
      await refetch();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (video) => {
    if (!window.confirm(`Delete "${video.title}"?`)) return;
    await videoService.remove(video._id);
    await refetch();
  };

  return (
    <div>
      <h2 style={{ color: 'var(--ap-primary)', marginBottom: 'var(--ap-space-sm)' }}>Lecture Videos</h2>

      {loading ? (
        <Spinner label="Loading videos…" />
      ) : videos && videos.length > 0 ? (
        <div style={{ marginBottom: 'var(--ap-space-md)' }}>
          {videos.map((v) => (
            <div key={v._id} className={formStyles.card}>
              <div className={formStyles.cardHeader}>
                <strong>
                  {v.order}. {v.title}
                </strong>
                <Badge tone={v.source === 'youtube' ? 'accent' : 'success'}>{v.source}</Badge>
              </div>
              {v.description && <p style={{ color: 'var(--ap-text-muted)', fontSize: '0.85rem' }}>{v.description}</p>}
              <Button size="sm" variant="ghost" onClick={() => handleDelete(v)}>
                Delete
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--ap-text-muted)', marginBottom: 'var(--ap-space-md)' }}>
          No videos yet for this course.
        </p>
      )}

      <form className={formStyles.form} onSubmit={handleSubmit}>
        <div className={formStyles.row}>
          <label>
            Title
            <input name="title" required value={form.title} onChange={handleChange} />
          </label>
          <label>
            Order
            <input type="number" name="order" min="0" value={form.order} onChange={handleChange} />
          </label>
        </div>

        <label>
          Description (optional)
          <input name="description" value={form.description} onChange={handleChange} />
        </label>

        <label>
          Source
          <select name="source" value={form.source} onChange={handleChange}>
            <option value="upload">Upload a video file</option>
            <option value="youtube">Link a YouTube video</option>
          </select>
        </label>

        {form.source === 'youtube' ? (
          <label>
            YouTube URL
            <input
              name="youtubeVideoId"
              placeholder="https://youtu.be/..."
              required
              value={form.youtubeVideoId}
              onChange={handleChange}
            />
            <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>
              The video must be set to <strong>Unlisted</strong> on YouTube — Private videos can't be embedded for
              anyone but the channel owner.
            </span>
          </label>
        ) : (
          <label>
            Video file (MP4/WEBM/MOV, up to 1GB)
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              required
              onChange={(e) => setFile(e.target.files[0])}
            />
          </label>
        )}

        <div className={formStyles.actions}>
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? 'Adding…' : 'Add Video'}
          </Button>
        </div>

        {error && <p className={formStyles.errorMsg}>{error}</p>}
      </form>
    </div>
  );
}
