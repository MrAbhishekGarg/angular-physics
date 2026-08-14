import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useMentors, useAdminStudents } from '../../hooks/useAdmin.js';
import { useCourses } from '../../hooks/useCourses.js';
import { authService } from '../../services/authService.js';
import { MENTOR_SECTIONS } from '../../data/mentorSections.js';
import { MENTOR_ACTIONS } from '../../data/mentorActions.js';
import formStyles from './DashboardForm.module.css';

const emptyForm = { name: '', email: '', password: '', phone: '' };

// MENTOR_ACTIONS grouped by its `group` field, in first-seen order — clusters
// related actions (e.g. all Question Bank actions together) in the form
// instead of one flat 7-item list.
const ACTION_GROUPS = MENTOR_ACTIONS.reduce((groups, action) => {
  let group = groups.find((g) => g.name === action.group);
  if (!group) {
    group = { name: action.group, actions: [] };
    groups.push(group);
  }
  group.actions.push(action);
  return groups;
}, []);

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
      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1.4rem', flexWrap: 'wrap' }}>
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

/**
 * Checked = this mentor CAN see that section. Saves the inverse
 * (restrictedSections) since that's what the backend actually stores —
 * a denylist, so an admin doing nothing to a new mentor leaves them with
 * full access by default. Also covers student access scope (all vs.
 * selected) and whether this mentor can reset student passwords — one
 * form, one Save button, one PATCH with the full current state.
 */
function PermissionsForm({ mentor, onDone, refetch }) {
  const [checked, setChecked] = useState(
    () => new Set(MENTOR_SECTIONS.filter((s) => !mentor.restrictedSections?.includes(s.key)).map((s) => s.key))
  );
  const [actionChecked, setActionChecked] = useState(
    () => new Set(MENTOR_ACTIONS.filter((a) => !mentor.restrictedActions?.includes(a.key)).map((a) => a.key))
  );
  const [canManagePaid, setCanManagePaid] = useState(mentor.canManagePaidContent !== false);
  const [accessMode, setAccessMode] = useState(mentor.studentAccessMode || 'all');
  const [assignedIds, setAssignedIds] = useState(() => new Set(mentor.assignedStudentIds || []));
  const [canReset, setCanReset] = useState(mentor.canResetPasswords !== false);
  const [studentQuery, setStudentQuery] = useState('');
  const { data: students, loading: studentsLoading } = useAdminStudents();
  const [courseAccessMode, setCourseAccessMode] = useState(mentor.courseAccessMode || 'all');
  const [assignedCourseIds, setAssignedCourseIds] = useState(() => new Set(mentor.assignedCourseIds || []));
  const [courseQuery, setCourseQuery] = useState('');
  const { data: courses, loading: coursesLoading } = useCourses();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const toggle = (key) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSuccess(false);
  };

  const toggleAction = (key) => {
    setActionChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSuccess(false);
  };

  const toggleStudent = (id) => {
    setAssignedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSuccess(false);
  };

  const toggleCourse = (id) => {
    setAssignedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSuccess(false);
  };

  const filteredStudents = (students || []).filter((s) => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  const filteredCourses = (courses || []).filter((c) => {
    const q = courseQuery.trim().toLowerCase();
    if (!q) return true;
    return c.title.toLowerCase().includes(q) || c.track.toLowerCase().includes(q);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const restrictedSections = MENTOR_SECTIONS.filter((s) => !checked.has(s.key)).map((s) => s.key);
      const restrictedActions = MENTOR_ACTIONS.filter((a) => !actionChecked.has(a.key)).map((a) => a.key);
      await authService.updateMentorPermissions(mentor._id, {
        restrictedSections,
        studentAccessMode: accessMode,
        assignedStudentIds: accessMode === 'selected' ? [...assignedIds] : [],
        canResetPasswords: canReset,
        restrictedActions,
        courseAccessMode,
        assignedCourseIds: courseAccessMode === 'selected' ? [...assignedCourseIds] : [],
        canManagePaidContent: canManagePaid,
      });
      await refetch();
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '0.5rem' }}>
      <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)', marginBottom: '0.4rem' }}>
        Uncheck a section to hide it from {mentor.name}'s dashboard entirely.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.4rem 0.8rem', marginBottom: '0.6rem' }}>
        {MENTOR_SECTIONS.map((s) => (
          <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 400, fontSize: '0.85rem' }}>
            <input type="checkbox" checked={checked.has(s.key)} onChange={() => toggle(s.key)} />
            {s.label}
          </label>
        ))}
      </div>

      <h3 style={{ fontSize: '0.85rem', color: 'var(--ap-primary)', margin: '0.6rem 0 0.3rem' }}>Content Permissions</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)', marginBottom: '0.4rem' }}>
        Fine-grained control within a section {mentor.name} can already see.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.6rem' }}>
        {ACTION_GROUPS.map((group) => (
          <div key={group.name}>
            <span style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)', display: 'block', marginBottom: '0.2rem' }}>
              {group.name}
            </span>
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              {group.actions.map((a) => (
                <label key={a.key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 400, fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={actionChecked.has(a.key)} onChange={() => toggleAction(a.key)} />
                  {a.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: '0.85rem', color: 'var(--ap-primary)', margin: '0.6rem 0 0.3rem' }}>Paid Content</h3>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 400, fontSize: '0.85rem', marginBottom: '0.6rem' }}>
        <input type="checkbox" checked={canManagePaid} onChange={() => setCanManagePaid((v) => !v)} />
        Can create/edit/delete paid tests and premium notes
      </label>

      <h3 style={{ fontSize: '0.85rem', color: 'var(--ap-primary)', margin: '0.6rem 0 0.3rem' }}>Student Access</h3>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 400, fontSize: '0.85rem' }}>
          <input type="radio" name={`access-${mentor._id}`} checked={accessMode === 'all'} onChange={() => setAccessMode('all')} />
          All students
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 400, fontSize: '0.85rem' }}>
          <input
            type="radio"
            name={`access-${mentor._id}`}
            checked={accessMode === 'selected'}
            onChange={() => setAccessMode('selected')}
          />
          Selected students only
        </label>
      </div>

      {accessMode === 'selected' && (
        <div style={{ border: '1px solid var(--ap-border)', padding: '0.5rem', marginBottom: '0.6rem' }}>
          <input
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
            placeholder="Search by name or email"
            style={{ marginBottom: '0.4rem', width: '100%' }}
          />
          {studentsLoading ? (
            <Spinner label="Loading students…" />
          ) : (
            <>
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {filteredStudents.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>No students match.</p>
                ) : (
                  filteredStudents.map((s) => (
                    <label key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 400, fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={assignedIds.has(s._id)} onChange={() => toggleStudent(s._id)} />
                      {s.name} — {s.email}
                    </label>
                  ))
                )}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)', marginTop: '0.4rem', marginBottom: 0 }}>
                {assignedIds.size} selected
              </p>
            </>
          )}
        </div>
      )}

      <h3 style={{ fontSize: '0.85rem', color: 'var(--ap-primary)', margin: '0.6rem 0 0.3rem' }}>Course Access</h3>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 400, fontSize: '0.85rem' }}>
          <input
            type="radio"
            name={`course-access-${mentor._id}`}
            checked={courseAccessMode === 'all'}
            onChange={() => setCourseAccessMode('all')}
          />
          All courses
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 400, fontSize: '0.85rem' }}>
          <input
            type="radio"
            name={`course-access-${mentor._id}`}
            checked={courseAccessMode === 'selected'}
            onChange={() => setCourseAccessMode('selected')}
          />
          Selected courses only
        </label>
      </div>

      {courseAccessMode === 'selected' && (
        <div style={{ border: '1px solid var(--ap-border)', padding: '0.5rem', marginBottom: '0.6rem' }}>
          <input
            value={courseQuery}
            onChange={(e) => setCourseQuery(e.target.value)}
            placeholder="Search by title or track"
            style={{ marginBottom: '0.4rem', width: '100%' }}
          />
          {coursesLoading ? (
            <Spinner label="Loading courses…" />
          ) : (
            <>
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {filteredCourses.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>No courses match.</p>
                ) : (
                  filteredCourses.map((c) => (
                    <label key={c._id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 400, fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={assignedCourseIds.has(c._id)} onChange={() => toggleCourse(c._id)} />
                      {c.title} — {c.track} ({c.status})
                    </label>
                  ))
                )}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)', marginTop: '0.4rem', marginBottom: 0 }}>
                {assignedCourseIds.size} selected
              </p>
            </>
          )}
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 400, fontSize: '0.85rem', marginBottom: '0.6rem' }}>
        <input type="checkbox" checked={canReset} onChange={() => setCanReset((v) => !v)} />
        Can reset student passwords
      </label>

      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? 'Saving…' : 'Save Permissions'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Close
        </Button>
        {success && <span style={{ color: 'var(--ap-success)', fontSize: '0.82rem' }}>Saved.</span>}
      </div>
      {error && <p className={formStyles.errorMsg} style={{ marginTop: '0.4rem' }}>{error}</p>}
    </form>
  );
}

export default function AdminMentors() {
  const { data: mentors, loading, error, refetch } = useMentors();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [resetOpenId, setResetOpenId] = useState(null);
  const [permOpenId, setPermOpenId] = useState(null);

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
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <Button size="sm" variant="ghost" onClick={() => setResetOpenId((id) => (id === m._id ? null : m._id))}>
                        {resetOpenId === m._id ? 'Close' : 'Reset Password'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPermOpenId((id) => (id === m._id ? null : m._id))}>
                        {permOpenId === m._id ? 'Close' : 'Permissions'}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(m)}>
                        Remove
                      </Button>
                    </div>
                    {resetOpenId === m._id && (
                      <ResetPasswordForm mentor={m} onDone={() => setResetOpenId(null)} />
                    )}
                    {permOpenId === m._id && (
                      <PermissionsForm mentor={m} onDone={() => setPermOpenId(null)} refetch={refetch} />
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
