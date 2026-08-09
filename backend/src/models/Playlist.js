import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    // Set when this playlist mirrors a real YouTube playlist — lets "reset"
    // re-derive its video membership from the live YouTube API. Playlists
    // created without one are purely manual/custom and untouched by reset.
    youtubePlaylistId: { type: String, default: null, trim: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Playlist || mongoose.model('Playlist', playlistSchema);
