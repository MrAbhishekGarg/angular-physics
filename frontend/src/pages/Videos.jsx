import { useState } from 'react';
import SEO from '../components/seo/SEO.jsx';
import Container from '../components/common/Container.jsx';
import SectionHeading from '../components/common/SectionHeading.jsx';
import Spinner from '../components/common/Spinner.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import PlaylistFilterBar from '../components/video/PlaylistFilterBar.jsx';
import VideoGrid from '../components/home/VideoGrid.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { videoLibraryService } from '../services/videoLibraryService.js';

export default function Videos() {
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const { data: playlists } = useFetch(() => videoLibraryService.listPlaylists(), []);
  const { data: videos, loading, error, refetch } = useFetch(
    () => videoLibraryService.listVideos(activePlaylistId),
    [activePlaylistId]
  );

  return (
    <>
      <SEO
        title="Videos"
        description="Every physics video from the Angular Physics YouTube channel, organized into playlists."
        path="/videos"
      />
      <main>
        <Container>
          <div style={{ paddingTop: 'var(--ap-space-xl)' }}>
            <SectionHeading
              align="left"
              eyebrow="Angular Physics on YouTube"
              title="All Videos"
              subtitle="Browse every upload, or filter by playlist."
            />

            {playlists && playlists.length > 0 && (
              <PlaylistFilterBar playlists={playlists} activePlaylistId={activePlaylistId} onChange={setActivePlaylistId} />
            )}

            {loading && <Spinner label="Loading videos…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}
            {videos && videos.length === 0 && <ErrorState message="No videos here yet — check back soon." />}
            {videos && videos.length > 0 && (
              <VideoGrid videos={videos.map((v) => ({ id: v.videoId, title: v.title, thumbnailUrl: v.thumbnailUrl }))} />
            )}
          </div>
        </Container>
      </main>
    </>
  );
}
