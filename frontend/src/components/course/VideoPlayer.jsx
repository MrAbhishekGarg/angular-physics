import { videoService } from '../../services/videoService.js';

/**
 * Best-effort playback hardening only — not real DRM. Disables the native
 * download button/right-click/PiP escape hatches; a determined viewer can
 * still screen-record. The stream URL is auth-gated per request (see
 * backend video.routes.js), never a static/public file.
 */
export default function VideoPlayer({ video }) {
  if (video.source === 'youtube') {
    return (
      <iframe
        width="100%"
        height="420"
        src={`https://www.youtube.com/embed/${video.youtubeVideoId}`}
        title={video.title}
        allow="accelerated-video-encode; encrypted-media; picture-in-picture"
        allowFullScreen
        style={{ border: 0, borderRadius: 10 }}
      />
    );
  }

  return (
    <video
      key={video._id}
      controls
      controlsList="nodownload noremoteplayback"
      disablePictureInPicture
      onContextMenu={(e) => e.preventDefault()}
      src={videoService.streamUrl(video._id)}
      style={{ width: '100%', maxHeight: 480, borderRadius: 10, background: '#000' }}
    />
  );
}
