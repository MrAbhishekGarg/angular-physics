import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useNotes } from '../../hooks/useNotes.js';
import { noteService } from '../../services/noteService.js';
import { paymentService } from '../../services/paymentService.js';
import { useAuth } from '../../hooks/useAuth.js';
import { formatPrice } from '../../data/courseFormat.js';
import { getTrackMeta } from '../../data/examTracks.js';
import formStyles from './DashboardForm.module.css';

export default function NotesLibrary() {
  const { user } = useAuth();
  const { data: notes, loading, error, refetch } = useNotes();
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const handleDownload = (note) => {
    window.open(noteService.downloadUrl(note._id), '_blank', 'noopener');
  };

  const handleBuy = async (note) => {
    setBusyId(note._id);
    setActionError('');
    try {
      await paymentService.purchase({
        itemType: 'note',
        itemId: note._id,
        itemName: note.title,
        studentName: user?.name,
        studentEmail: user?.email,
      });
      handleDownload(note);
      await refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <SEO title="Notes Library" description="Browse and download free or premium notes." path="/dashboard/student/notes" />
      <DashboardLayout role="student">
        <div className={formStyles.wrap} style={{ maxWidth: 960 }}>
          <h1>Notes Library</h1>

            {loading && <Spinner label="Loading notes…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}
            {actionError && <p className={formStyles.errorMsg}>{actionError}</p>}

            {notes && notes.length === 0 && <ErrorState message="No notes available yet." />}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--ap-space-sm)' }}>
              {(notes || []).map((note) => {
                const track = getTrackMeta(note.track);
                return (
                  <div key={note._id} className={formStyles.card}>
                    <div className={formStyles.cardHeader}>
                      <span>{track?.icon}</span>
                      <Badge tone={note.category === 'premium' ? 'accent' : 'success'}>
                        {note.category === 'premium' ? formatPrice(note.price, note.currency) : 'Free'}
                      </Badge>
                    </div>
                    <strong>{note.title}</strong>
                    <p style={{ color: 'var(--ap-text-muted)', fontSize: '0.85rem' }}>{note.description}</p>
                    {note.category === 'free' ? (
                      <Button size="sm" onClick={() => handleDownload(note)} disabled={!note.fileKey}>
                        {note.fileKey ? 'Download' : 'No file yet'}
                      </Button>
                    ) : (
                      <Button size="sm" disabled={busyId === note._id || !note.fileKey} onClick={() => handleBuy(note)}>
                        {busyId === note._id ? 'Processing…' : note.fileKey ? `Buy for ${formatPrice(note.price, note.currency)}` : 'No file yet'}
                      </Button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
