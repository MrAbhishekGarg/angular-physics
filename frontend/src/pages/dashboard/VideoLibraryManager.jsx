import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import PlaylistFilterBar from '../../components/video/PlaylistFilterBar.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { videoLibraryService } from '../../services/videoLibraryService.js';
import formStyles from './DashboardForm.module.css';
import styles from './VideoLibraryManager.module.css';

const emptyPlaylistForm = { title: '', youtubePlaylistId: '' };

function PlaylistRow({ playlist, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(playlist.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setBusy(true);
    setError('');
    try {
      await videoLibraryService.updatePlaylist(playlist._id, { title });
      setEditing(false);
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete playlist "${playlist.title}"? Videos stay in the library, they just leave this playlist.`)) return;
    await videoLibraryService.removePlaylist(playlist._id);
    await onDeleted();
  };

  return (
    <div className={formStyles.card}>
      <div className={formStyles.cardHeader}>
        {editing ? (
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1, marginRight: '0.5rem' }} />
        ) : (
          <strong>{playlist.title}</strong>
        )}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge tone={playlist.youtubePlaylistId ? 'success' : 'default'}>
            {playlist.youtubePlaylistId ? 'Synced from YouTube' : 'Custom'}
          </Badge>
          <Badge tone="launching">{playlist.videoCount} video{playlist.videoCount === 1 ? '' : 's'}</Badge>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {editing ? (
          <>
            <Button size="sm" disabled={busy} onClick={handleSave}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setTitle(playlist.title); }}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Rename
            </Button>
            <Button size="sm" variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        )}
      </div>
      {error && <p className={formStyles.errorMsg}>{error}</p>}
    </div>
  );
}

function VideoRow({ video, playlists, onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [busyPlaylistId, setBusyPlaylistId] = useState(null);

  const toggle = async (playlistId, isMember) => {
    setBusyPlaylistId(playlistId);
    try {
      if (isMember) await videoLibraryService.removeVideoFromPlaylist(playlistId, video._id);
      else await videoLibraryService.addVideoToPlaylist(playlistId, video._id);
      await onChanged();
    } finally {
      setBusyPlaylistId(null);
    }
  };

  return (
    <div className={formStyles.card}>
      <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
        <img src={video.thumbnailUrl} alt="" style={{ width: 80, height: 45, objectFit: 'cover', flexShrink: 0 }} />
        <span style={{ fontSize: '0.85rem', flex: 1 }}>{video.title}</span>
        <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Close' : `Playlists (${video.playlistIds.length})`}
        </Button>
      </div>
      {expanded && (
        <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {playlists.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>No playlists yet — add one below.</p>}
          {playlists.map((p) => {
            const isMember = video.playlistIds.includes(p._id);
            return (
              <label key={p._id} className={formStyles.checkboxLabel} style={{ fontWeight: 400, fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={isMember}
                  disabled={busyPlaylistId === p._id}
                  onChange={() => toggle(p._id, isMember)}
                />
                {p.title}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function VideoLibraryManager() {
  const { data: playlists, loading: playlistsLoading, error: playlistsError, refetch: refetchPlaylists } = useFetch(
    () => videoLibraryService.listPlaylists(),
    []
  );
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const { data: videos, loading: videosLoading, error: videosError, refetch: refetchVideos } = useFetch(
    () => videoLibraryService.listVideos(activePlaylistId),
    [activePlaylistId]
  );
  const [search, setSearch] = useState('');

  const [form, setForm] = useState(emptyPlaylistForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState('');

  const refetchAll = () => Promise.all([refetchPlaylists(), refetchVideos()]);

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!form.title.trim() && !form.youtubePlaylistId.trim()) {
      setCreateError('Give the playlist a title, or paste a YouTube playlist URL/id (or both).');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await videoLibraryService.createPlaylist({
        title: form.title.trim() || undefined,
        youtubePlaylistId: form.youtubePlaylistId.trim() || undefined,
      });
      setForm(emptyPlaylistForm);
      await refetchAll();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSync = async () => {
    if (!window.confirm('This refreshes the video library from YouTube and resets every YouTube-linked playlist to exactly match YouTube — any manual video changes on those playlists will be discarded. Custom playlists are untouched. Continue?')) return;
    setSyncing(true);
    setSyncError('');
    setSyncResult(null);
    try {
      const result = await videoLibraryService.syncFromYoutube();
      setSyncResult(result);
      await refetchAll();
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const filteredVideos = (videos || []).filter((v) => v.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <SEO title="Manage Videos" description="Manage the YouTube video library and playlists." path="/dashboard/mentor/videos" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 1000 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h1>Manage Videos &amp; Playlists</h1>
            <Button variant="secondary" disabled={syncing} onClick={handleSync}>
              {syncing ? 'Syncing…' : 'Reset — Sync from YouTube'}
            </Button>
          </div>
          {syncResult && (
            <p style={{ color: 'var(--ap-success)', fontSize: '0.85rem' }}>
              Synced {syncResult.videosSynced} video{syncResult.videosSynced === 1 ? '' : 's'} across {syncResult.playlistsSynced} playlist
              {syncResult.playlistsSynced === 1 ? '' : 's'}.
            </p>
          )}
          {syncError && <p className={formStyles.errorMsg}>{syncError}</p>}

          <h2 style={{ color: 'var(--ap-primary)', marginTop: 'var(--ap-space-md)' }}>Playlists</h2>
          {playlistsLoading && <Spinner label="Loading playlists…" />}
          {playlistsError && <ErrorState message={playlistsError} onRetry={refetchPlaylists} />}
          {playlists && playlists.length === 0 && <p style={{ color: 'var(--ap-text-muted)' }}>No playlists yet.</p>}
          {(playlists || []).map((p) => (
            <PlaylistRow key={p._id} playlist={p} onSaved={refetchAll} onDeleted={refetchAll} />
          ))}

          <div className={formStyles.card}>
            <strong>Add Playlist</strong>
            <form className={formStyles.form} onSubmit={handleCreatePlaylist} style={{ marginTop: '0.5rem' }}>
              <div className={formStyles.row}>
                <label>
                  Title (optional if a YouTube playlist is given below)
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Mock Test Reviews"
                  />
                </label>
                <label>
                  YouTube playlist URL or id (optional)
                  <input
                    value={form.youtubePlaylistId}
                    onChange={(e) => setForm((f) => ({ ...f, youtubePlaylistId: e.target.value }))}
                    placeholder="https://youtube.com/playlist?list=..."
                  />
                </label>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>
                Give a YouTube playlist and its videos sync automatically (title auto-fills too) — it'll also stay in
                sync whenever you hit "Reset — Sync from YouTube" above. Leave it blank for a custom playlist you
                curate by hand instead.
              </p>
              <div className={formStyles.actions}>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Adding…' : '+ Add Playlist'}
                </Button>
              </div>
              {createError && <p className={formStyles.errorMsg}>{createError}</p>}
            </form>
          </div>

          <h2 style={{ color: 'var(--ap-primary)', marginTop: 'var(--ap-space-md)' }}>Videos</h2>
          <div className={styles.toolbar}>
            <div className={styles.playlistFilterWrap}>
              <PlaylistFilterBar playlists={playlists || []} activePlaylistId={activePlaylistId} onChange={setActivePlaylistId} compact />
            </div>
            <div className={styles.searchWrap}>
              <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6" />
                <line x1="14" y1="14" x2="18.5" y2="18.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <input
                className={styles.searchInput}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search videos by title…"
                aria-label="Search videos by title"
              />
            </div>
          </div>

          {videosLoading && <Spinner label="Loading videos…" />}
          {videosError && <ErrorState message={videosError} onRetry={refetchVideos} />}
          {videos && videos.length === 0 && (
            <p style={{ color: 'var(--ap-text-muted)' }}>
              No videos yet — hit "Reset — Sync from YouTube" above to pull in your channel's uploads.
            </p>
          )}
          {videos && videos.length > 0 && (
            <p className={styles.resultCount}>
              Showing {filteredVideos.length} of {videos.length} video{videos.length === 1 ? '' : 's'}
              {activePlaylistId && (playlists || []).find((p) => p._id === activePlaylistId)
                ? ` in "${(playlists || []).find((p) => p._id === activePlaylistId).title}"`
                : ''}
            </p>
          )}
          {filteredVideos.map((v) => (
            <VideoRow key={v._id} video={v} playlists={playlists || []} onChanged={refetchAll} />
          ))}
        </div>
      </DashboardLayout>
    </>
  );
}
