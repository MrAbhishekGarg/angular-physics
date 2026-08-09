import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useAdminStudents } from '../../hooks/useAdmin.js';
import { authService } from '../../services/authService.js';
import formStyles from './DashboardForm.module.css';

function initials(name) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function ResetPasswordForm({ student, onDone }) {
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await authService.resetStudentPassword(student._id, newPassword);
      setSuccess(true);
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <label style={{ flex: 1, minWidth: 180 }}>
        New password
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </label>
      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1.4rem' }}>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? 'Saving…' : 'Set Password'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Close
        </Button>
      </div>
      {success && <p style={{ color: 'var(--ap-success)', fontSize: '0.82rem', width: '100%' }}>Password updated — share it with {student.name} directly.</p>}
      {error && <p className={formStyles.errorMsg} style={{ width: '100%' }}>{error}</p>}
    </form>
  );
}

export default function AdminStudents() {
  const { data: students, loading, error, refetch } = useAdminStudents();
  const [resetOpenId, setResetOpenId] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = (students || []).filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  return (
    <>
      <SEO title="All Students — Login Directory" description="Every student login, with password reset." path="/dashboard/mentor/admin/students" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h1 style={{ marginBottom: 0 }}>Student Login Directory</h1>
            {students && <Badge>{students.length} student{students.length === 1 ? '' : 's'}</Badge>}
          </div>
          <p style={{ color: 'var(--ap-text-muted)' }}>
            Every student account's login details, with password reset one click away. Looking for enrollment/test
            analytics instead? See <Link to="/dashboard/mentor/students">All Students</Link>.
          </p>

          <div className={formStyles.form} style={{ marginBottom: 'var(--ap-space-md)' }}>
            <label style={{ maxWidth: 320 }}>
              Search
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" />
            </label>
          </div>

          {loading && <Spinner label="Loading students…" />}
          {error && <ErrorState message={error} onRetry={refetch} />}

          {students && students.length === 0 && <p style={{ color: 'var(--ap-text-muted)' }}>No students yet.</p>}
          {students && students.length > 0 && filtered.length === 0 && (
            <p style={{ color: 'var(--ap-text-muted)' }}>No students match "{search}".</p>
          )}

          {filtered.map((s) => (
            <div key={s._id} className={formStyles.card}>
              <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'var(--ap-bg-muted)',
                    color: 'var(--ap-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  {initials(s.name) || '?'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={formStyles.cardHeader} style={{ marginBottom: '0.15rem' }}>
                    <strong>{s.name}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>
                      Joined {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)', marginBottom: '0.6rem' }}>
                    {s.email} · {s.phone}
                  </p>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <Button size="sm" variant="ghost" onClick={() => setResetOpenId((id) => (id === s._id ? null : s._id))}>
                      {resetOpenId === s._id ? 'Close' : 'Reset Password'}
                    </Button>
                    <Button as={Link} to={`/dashboard/mentor/students/${s._id}`} size="sm" variant="ghost">
                      View Analytics
                    </Button>
                  </div>
                  {resetOpenId === s._id && <ResetPasswordForm student={s} onDone={() => setResetOpenId(null)} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DashboardLayout>
    </>
  );
}
