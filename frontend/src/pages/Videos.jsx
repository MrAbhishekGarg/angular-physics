import { useState } from 'react';
import SEO from '../components/seo/SEO.jsx';
import JsonLd, { videoListSchema } from '../components/seo/JsonLd.jsx';
import Container from '../components/common/Container.jsx';
import Spinner from '../components/common/Spinner.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import PlaylistFilterBar from '../components/video/PlaylistFilterBar.jsx';
import VideosHero from '../components/video/VideosHero.jsx';
import VideoGrid from '../components/home/VideoGrid.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { videoLibraryService } from '../services/videoLibraryService.js';
import styles from './Videos.module.css';

export default function Videos() {
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const { data: playlists } = useFetch(() => videoLibraryService.listPlaylists(), []);
  const { data: videos, loading, error, refetch } = useFetch(
    () => videoLibraryService.listVideos(activePlaylistId),
    [activePlaylistId]
  );

  const gridVideos = videos?.map((v) => ({ id: v.videoId, title: v.title, thumbnailUrl: v.thumbnailUrl, publishedAt: v.publishedAt }));

  return (
    <>
      <SEO
        title="Videos"
        description="Every physics video from the Angular Physics YouTube channel, organized into playlists."
        path="/videos"
      />
      {gridVideos && gridVideos.length > 0 && <JsonLd schema={videoListSchema(gridVideos)} />}
      <main>
        <VideosHero count={videos?.length} />
        <Container>
          <div className={styles.body}>
            {playlists && playlists.length > 0 && (
              <PlaylistFilterBar playlists={playlists} activePlaylistId={activePlaylistId} onChange={setActivePlaylistId} />
            )}

            {loading && <Spinner label="Loading videos…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}
            {videos && videos.length === 0 && <ErrorState message="No videos here yet — check back soon." />}
            {gridVideos && gridVideos.length > 0 && <VideoGrid videos={gridVideos} />}
          </div>
        </Container>
      </main>
    </>
  );
}
