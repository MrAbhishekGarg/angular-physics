import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useMentors } from '../../hooks/useAdmin.js';
import { authService } from '../../services/authService.js';
import formStyles from './DashboardForm.module.css';

const emptyForm = { name: '', email: '', password: '', phone: '' };

function ResetPasswordForm({ mentor, onDone, onCancel }) {
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await authService.resetMentorPassword(mentor._id, newPassword);
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
        <Button type="button" size="sm" variant="ghost" onClick={onDone || onCancel}>
          Close
        </Button>
      </div>
      {success && <p style={{ color: 'var(--ap-success)', fontSize: '0.82rem', width: '100%' }}>Password updated — share it with {mentor.name} directly.</p>}
      {error && <p className={formStyles.errorMsg} style={{ width: '100%' }}>{error}</p>}
    </form>
  );
}

export default function AdminMentors() {
  const { data: mentors, loading, error, refetch } = useMentors();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [resetOpenId, setResetOpenId] = useState(null);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((f) => ({ ...f, phone: digitsOnly }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await authService.createMentor(form);
      setForm(emptyForm);
      await refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (mentor) => {
    if (!window.confirm(`Remove mentor access for "${mentor.name}"? They will no longer be able to log in.`)) return;
    await authService.removeMentor(mentor._id);
    await refetch();
  };

  return (
    <>
      <SEO title="Manage Mentors" description="Create mentor accounts and reset passwords." path="/dashboard/mentor/admin/mentors" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <h1>Manage Mentors</h1>
          <p style={{ color: 'var(--ap-text-muted)' }}>
            Every mentor shares the same courses, tests, and question bank — this just gives a co-teacher their own
            login into the same dashboard.
          </p>

          {loading && <Spinner label="Loading mentors…" />}
          {error && <ErrorState message={error} onRetry={refetch} />}

          {mentors && (
            <div style={{ marginBottom: 'var(--ap-space-lg)' }}>
              {mentors.length === 0 ? (
                <p style={{ color: 'var(--ap-text-muted)' }}>No additional mentors yet.</p>
              ) : (
                mentors.map((m) => (
                  <div key={m._id} className={formStyles.card}>
                    <div className={formStyles.cardHeader}>
                      <strong>{m.name}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>
                        Joined {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)' }}>
                      {m.email} · {m.phone}
                    </p>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <Button size="sm" variant="ghost" onClick={() => setResetOpenId((id) => (id === m._id ? null : m._id))}>
                        {resetOpenId === m._id ? 'Close' : 'Reset Password'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(m)}>
                        Remove
                      </Button>
                    </div>
                    {resetOpenId === m._id && (
                      <ResetPasswordForm mentor={m} onDone={() => setResetOpenId(null)} />
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          <h2 style={{ color: 'var(--ap-primary)', marginBottom: 'var(--ap-space-sm)' }}>Add a Mentor</h2>
          <form className={formStyles.form} onSubmit={handleSubmit}>
            <div className={formStyles.row}>
              <label>
                Name
                <input name="name" required value={form.name} onChange={handleChange} />
              </label>
              <label>
                Email
                <input type="email" name="email" required value={form.email} onChange={handleChange} />
              </label>
            </div>
            <div className={formStyles.row}>
              <label>
                Phone
                <input
                  type="tel"
                  name="phone"
                  required
                  inputMode="numeric"
                  maxLength={10}
                  pattern="[6-9][0-9]{9}"
                  title="Enter a valid 10-digit mobile number"
                  value={form.phone}
                  onChange={handlePhoneChange}
                />
              </label>
              <label>
                Temporary password
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                />
              </label>
            </div>

            <div className={formStyles.actions}>
              <Button type="submit" disabled={busy}>
                {busy ? 'Creating…' : 'Create Mentor'}
              </Button>
            </div>

            {formError && <p className={formStyles.errorMsg}>{formError}</p>}
          </form>
        </div>
      </DashboardLayout>
    </>
  );
}
