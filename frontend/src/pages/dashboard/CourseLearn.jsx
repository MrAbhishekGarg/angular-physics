import { useState } from 'react';
import { useParams } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import VideoPlayer from '../../components/course/VideoPlayer.jsx';
import { useVideosForCourse } from '../../hooks/useVideos.js';
import formStyles from './DashboardForm.module.css';

export default function CourseLearn() {
  const { courseId } = useParams();
  const { data: videos, loading, error, refetch } = useVideosForCourse(courseId);
  const [activeVideo, setActiveVideo] = useState(null);

  const current = activeVideo || (videos && videos[0]) || null;

  return (
    <>
      <SEO title="Course Videos" description="Watch your enrolled course lectures." path="/dashboard/student" />
      <DashboardLayout role="student">
        <div className={formStyles.wrap} style={{ maxWidth: 960 }}>
          <h1>Lecture Videos</h1>

            {loading && <Spinner label="Loading videos…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}

            {videos && videos.length === 0 && <ErrorState message="No videos have been uploaded for this course yet." />}

            {current && (
              <div style={{ marginBottom: 'var(--ap-space-md)' }}>
                <VideoPlayer video={current} />
                <h2 style={{ marginTop: '0.6rem', color: 'var(--ap-primary)' }}>{current.title}</h2>
                {current.description && <p style={{ color: 'var(--ap-text-muted)' }}>{current.description}</p>}
              </div>
            )}

            {videos && videos.length > 1 && (
              <div>
                {videos.map((v) => (
                  <button
                    key={v._id}
                    type="button"
                    onClick={() => setActiveVideo(v)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.6rem 0.8rem',
                      marginBottom: '0.4rem',
                      borderRadius: 8,
                      border: '1px solid var(--ap-border)',
                      background: current?._id === v._id ? 'var(--ap-bg-muted)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {v.order}. {v.title}
                  </button>
                ))}
              </div>
            )}
        </div>
      </DashboardLayout>
    </>
  );
}
