import Container from '../common/Container.jsx';
import SectionHeading from '../common/SectionHeading.jsx';
import VideoGrid from './VideoGrid.jsx';
import { useFeaturedVideos } from '../../hooks/useFeaturedVideos.js';
import styles from './FreeResources.module.css';

/** Mentor-curated highlights — works even without a YouTube API key. */
export default function VideoHighlights() {
  const { data: videos } = useFeaturedVideos();

  if (!videos || videos.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="video-highlights-heading">
      <Container>
        <SectionHeading eyebrow="Watch & Learn" title="Video Highlights" subtitle="Hand-picked lessons worth revisiting." />
        <VideoGrid
          videos={videos.map((v) => ({
            id: v.youtubeVideoId,
            title: v.title,
            thumbnailUrl: `https://i.ytimg.com/vi/${v.youtubeVideoId}/hqdefault.jpg`,
          }))}
        />
      </Container>
    </section>
  );
}
