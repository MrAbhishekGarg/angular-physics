import { Link } from 'react-router-dom';
import Container from '../common/Container.jsx';
import SectionHeading from '../common/SectionHeading.jsx';
import Button from '../common/Button.jsx';
import VideoGrid from './VideoGrid.jsx';
import { useYoutubeLatest } from '../../hooks/useYoutubeLatest.js';
import styles from './FreeResources.module.css';

/**
 * Auto-pulled from the YouTube Data API — stays hidden (renders nothing)
 * whenever YOUTUBE_API_KEY/YOUTUBE_CHANNEL_ID aren't configured, since the
 * API then returns [] rather than an error.
 */
export default function LatestVideos() {
  const { data: videos } = useYoutubeLatest();

  if (!videos || videos.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="latest-videos-heading">
      <Container>
        <SectionHeading eyebrow="Fresh on YouTube" title="Latest Uploads" subtitle="Straight from the Angular Physics channel." />
        <VideoGrid videos={videos.map((v) => ({ id: v.videoId, title: v.title, thumbnailUrl: v.thumbnailUrl }))} />
        <div className={styles.viewAll}>
          <Button as={Link} to="/videos" variant="ghost">
            View All Videos &amp; Playlists
          </Button>
        </div>
      </Container>
    </section>
  );
}
