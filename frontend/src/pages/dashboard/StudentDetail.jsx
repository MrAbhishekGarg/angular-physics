import { useState } from 'react';
import { useParams } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Stat from '../../components/common/Stat.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useStudentDetailAnalytics } from '../../hooks/useAnalytics.js';
import { useCourses } from '../../hooks/useCourses.js';
import { useAuth } from '../../hooks/useAuth.js';
import { testService } from '../../services/testService.js';
import { authService } from '../../services/authService.js';
import { enrollmentService } from '../../services/enrollmentService.js';
import { formatPrice } from '../../data/courseFormat.js';
import formStyles from './DashboardForm.module.css';
import dashboardStyles from './Dashboard.module.css';

const STATUS_TONE = { pending: 'accent', active: 'success', completed: 'launching', cancelled: 'default' };

function ResetPasswordForm({ studentId, onDone }) {
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await authService.resetStudentPassword(studentId, newPassword);
      setSuccess(true);
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
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
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Close
        </Button>
      </div>
      {success && <p style={{ color: 'var(--ap-success)', fontSize: '0.82rem', width: '100%' }}>Password updated — share it with the student directly.</p>}
      {error && <p className={formStyles.errorMsg} style={{ width: '100%' }}>{error}</p>}
    </form>
  );
}

/**
 * Admin-only: directly grants access to any course, skipping the normal
 * request -> mentor-approval flow — see enrollment.service.js#grantCourseAccess.
 * Uses the public (unfiltered) course list since this must work for "any
 * course," independent of the acting admin's own course-visibility scope
 * (admin never carries one anyway, but this keeps the picker's intent explicit).
 */
function GrantAccessForm({ studentId, onDone, onGranted }) {
  const { data: courses, loading: coursesLoading } = useCourses();
  const [courseId, setCourseId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseId) return;
    setBusy(true);
    setError('');
    try {
      await enrollmentService.grantAccess(studentId, courseId);
      setSuccess(true);
      await onGranted();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={formStyles.form} onSubmit={handleSubmit} style={{ marginTop: '0.6rem', maxWidth: 420 }}>
      <label>
        Course
        {coursesLoading ? (
          <Spinner label="Loading courses…" />
        ) : (
          <select
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              setSuccess(false);
            }}
            required
          >
            <option value="">Select a course…</option>
            {(courses || []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
        )}
      </label>
      <div className={formStyles.actions}>
        <Button type="submit" size="sm" disabled={busy || !courseId}>
          {busy ? 'Granting…' : 'Grant Access'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Close
        </Button>
      </div>
      {success && (
        <p style={{ color: 'var(--ap-success)', fontSize: '0.82rem' }}>
          Access granted — the course now shows as active for this student.
        </p>
      )}
      {error && <p className={formStyles.errorMsg}>{error}</p>}
    </form>
  );
}

const ACCESS_MODULES = [
  { key: 'tests', label: 'Tests' },
  { key: 'worksheets', label: 'DPPs & Assignments (Worksheets)' },
  { key: 'notes', label: 'Notes' },
  { key: 'doubts', label: 'Doubts' },
];

/**
 * Admin-only: per-student content access, independent of course
 * enrollment — see backend/src/models/User.js#restrictedStudentAccess.
 * Unlike GrantAccessForm (which activates a course), this blocks/unblocks
 * whole modules (tests/worksheets/notes) regardless of enrollment status.
 */
function ManageAccessForm({ studentId, initialRestricted, onDone, onSaved }) {
  const [restricted, setRestricted] = useState(() => new Set(initialRestricted || []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const toggle = (key) => {
    setRestricted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSuccess(false);
  };

  const handleSave = async () => {
    setBusy(true);
    setError('');
    try {
      await authService.updateStudentAccess(studentId, [...restricted]);
      setSuccess(true);
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: '0.6rem', maxWidth: 420 }}>
      <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)', margin: '0 0 0.5rem' }}>
        Unchecking a module blocks this student from it everywhere on the site, regardless of course enrollment.
      </p>
      {ACCESS_MODULES.map((m) => (
        <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', fontSize: '0.9rem' }}>
          <input type="checkbox" checked={!restricted.has(m.key)} onChange={() => toggle(m.key)} />
          {m.label}
        </label>
      ))}
      <div className={formStyles.actions} style={{ marginTop: '0.5rem' }}>
        <Button type="button" size="sm" disabled={busy} onClick={handleSave}>
          {busy ? 'Saving…' : 'Save Access'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Close
        </Button>
      </div>
      {success && <p style={{ color: 'var(--ap-success)', fontSize: '0.82rem' }}>Access updated.</p>}
      {error && <p className={formStyles.errorMsg}>{error}</p>}
    </div>
  );
}

const todayMonth = () => toDateInputValue(new Date()).slice(0, 7);

// A server-computed date (e.g. a monthly due date) round-trips through JSON
// as UTC — slicing that ISO string directly can land on the wrong calendar
// day once the local timezone is anything but UTC (IST is +5:30, so a local
// midnight due date serializes to the previous day's UTC evening). Reading
// it back through local Date getters, the same way it's displayed elsewhere
// via toLocaleDateString, keeps the <input type="date"> value in sync with
// what the mentor actually sees printed next to it.
function toDateInputValue(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Mentor/admin-managed fee tracking for one student's enrollment in a live
 * course (no public price/payment gateway — the fee and security deposit
 * are negotiated per student and tracked manually here). Recorded courses
 * never render this; their fee is Course.price + a Purchase record.
 */
function EnrollmentFeeManager({ enrollment, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feeType, setFeeType] = useState(enrollment.feeType || 'monthly');
  const [totalFee, setTotalFee] = useState(enrollment.totalFee || '');
  const [monthlyFee, setMonthlyFee] = useState(enrollment.monthlyFee || '');
  const [securityAmount, setSecurityAmount] = useState(enrollment.securityAmount || '');
  const [securityPaid, setSecurityPaid] = useState(enrollment.securityPaid || 0);
  const [registrationDate, setRegistrationDate] = useState(toDateInputValue(enrollment.registrationDate));
  const [newPayment, setNewPayment] = useState({ amount: '', date: toDateInputValue(new Date()), note: '' });
  const [newMonth, setNewMonth] = useState({ month: todayMonth(), amount: enrollment.monthlyFee || '', dueDate: '' });
  // One editable "paid on" date per month row, for backfilling a month that
  // was actually paid in the past rather than stamping today's date —
  // defaults to that month's own due date since that's the best guess for
  // when it was likely paid.
  const [paidDateByMonth, setPaidDateByMonth] = useState({});
  const [reminderStatus, setReminderStatus] = useState('idle'); // idle | sending | sent | error
  const [reminderError, setReminderError] = useState('');

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveFeeConfig = (e) => {
    e.preventDefault();
    run(() =>
      enrollmentService.setFeeConfig(enrollment._id, {
        feeType,
        totalFee: feeType === 'one-time' ? Number(totalFee) || 0 : undefined,
        monthlyFee: feeType === 'monthly' ? Number(monthlyFee) || 0 : undefined,
        securityAmount: Number(securityAmount) || 0,
        registrationDate: registrationDate || undefined,
      })
    );
  };

  const generateMonths = () => run(() => enrollmentService.generateMissingMonths(enrollment._id));

  const saveSecurityPaid = () => run(() => enrollmentService.setSecurityPaid(enrollment._id, Number(securityPaid) || 0));

  const addPayment = (e) => {
    e.preventDefault();
    if (!newPayment.amount) return;
    run(async () => {
      await enrollmentService.addPayment(enrollment._id, {
        amount: Number(newPayment.amount),
        date: newPayment.date,
        note: newPayment.note,
      });
      setNewPayment({ amount: '', date: toDateInputValue(new Date()), note: '' });
    });
  };

  const removePayment = (paymentId) => run(() => enrollmentService.removePayment(enrollment._id, paymentId));

  const addMonth = (e) => {
    e.preventDefault();
    if (!newMonth.month) return;
    run(async () => {
      await enrollmentService.addMonthlyEntry(enrollment._id, {
        month: newMonth.month,
        amount: newMonth.amount ? Number(newMonth.amount) : undefined,
        dueDate: newMonth.dueDate || undefined,
      });
      setNewMonth({ month: '', amount: enrollment.monthlyFee || '', dueDate: '' });
    });
  };

  const toggleMonthPaid = (monthId, paid, paidDate) =>
    run(() => enrollmentService.updateMonthlyEntry(enrollment._id, monthId, { paid, paidDate: paid ? paidDate : undefined }));
  const removeMonth = (monthId) => run(() => enrollmentService.removeMonthlyEntry(enrollment._id, monthId));

  const totalPaid = (enrollment.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const nextUnpaidMonth = (enrollment.monthlyPayments || []).find((m) => !m.paid);
  const oneTimeRemaining = (enrollment.totalFee || 0) - totalPaid;
  const hasPendingFee = enrollment.feeType === 'monthly' ? Boolean(nextUnpaidMonth) : oneTimeRemaining > 0;

  const handleSendReminder = async () => {
    setReminderStatus('sending');
    setReminderError('');
    try {
      await enrollmentService.sendFeeReminder(enrollment._id, nextUnpaidMonth?.month);
      setReminderStatus('sent');
    } catch (err) {
      setReminderStatus('error');
      setReminderError(err.message);
    }
  };

  return (
    <div className={`${formStyles.card} ${formStyles.form}`} style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <strong>{enrollment.courseId?.title}</strong>
        {hasPendingFee && (
          <div style={{ textAlign: 'right' }}>
            <Badge tone="accent">
              {enrollment.feeType === 'monthly'
                ? `${nextUnpaidMonth.month} due — ₹${nextUnpaidMonth.amount}${nextUnpaidMonth.dueDate ? ` by ${new Date(nextUnpaidMonth.dueDate).toLocaleDateString('en-IN')}` : ''}`
                : `₹${oneTimeRemaining} pending`}
            </Badge>
            <div style={{ marginTop: '0.3rem' }}>
              <Button size="sm" variant="ghost" disabled={reminderStatus === 'sending'} onClick={handleSendReminder}>
                {reminderStatus === 'sending' ? 'Sending…' : 'Send Reminder'}
              </Button>
            </div>
            {reminderStatus === 'sent' && <p style={{ fontSize: '0.75rem', color: 'var(--ap-success)', margin: '0.2rem 0 0' }}>Sent to student portal.</p>}
            {reminderStatus === 'error' && <p style={{ fontSize: '0.75rem', color: 'var(--ap-danger)', margin: '0.2rem 0 0' }}>{reminderError}</p>}
          </div>
        )}
      </div>

      <form onSubmit={saveFeeConfig} className={formStyles.row} style={{ marginTop: '0.5rem', alignItems: 'flex-end' }}>
        <label>
          Registration Date
          <input type="date" value={registrationDate} onChange={(e) => setRegistrationDate(e.target.value)} />
        </label>
        <label>
          Fee type
          <select value={feeType} onChange={(e) => setFeeType(e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="one-time">One-time</option>
          </select>
        </label>
        {feeType === 'monthly' ? (
          <label>
            Monthly Fee (₹)
            <input type="number" min="0" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} />
          </label>
        ) : (
          <label>
            Total Fee (₹)
            <input type="number" min="0" value={totalFee} onChange={(e) => setTotalFee(e.target.value)} />
          </label>
        )}
        <label>
          Security Deposit (₹)
          <input type="number" min="0" value={securityAmount} onChange={(e) => setSecurityAmount(e.target.value)} />
        </label>
        <Button type="submit" size="sm" disabled={busy}>
          Save Terms
        </Button>
      </form>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        <label>
          Security Paid (₹)
          <input type="number" min="0" value={securityPaid} onChange={(e) => setSecurityPaid(e.target.value)} />
        </label>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={saveSecurityPaid}>
          Update
        </Button>
        <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>
          of {enrollment.securityAmount || 0} deposit
        </span>
      </div>

      {feeType === 'one-time' ? (
        <div style={{ marginTop: '0.75rem' }}>
          <p style={{ fontSize: '0.85rem' }}>
            Paid so far: <strong>₹{totalPaid}</strong> of ₹{enrollment.totalFee || 0}
          </p>
          {(enrollment.payments || []).map((p) => (
            <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.85rem' }}>
              <span>
                ₹{p.amount} on {new Date(p.date).toLocaleDateString('en-IN')} {p.note ? `— ${p.note}` : ''}
              </span>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => removePayment(p._id)}>
                Remove
              </Button>
            </div>
          ))}
          <form onSubmit={addPayment} className={formStyles.row} style={{ marginTop: '0.4rem', alignItems: 'flex-end' }}>
            <label>
              Amount (₹)
              <input type="number" min="0" value={newPayment.amount} onChange={(e) => setNewPayment((f) => ({ ...f, amount: e.target.value }))} />
            </label>
            <label>
              Date
              <input type="date" value={newPayment.date} onChange={(e) => setNewPayment((f) => ({ ...f, date: e.target.value }))} />
            </label>
            <label>
              Note (optional)
              <input value={newPayment.note} onChange={(e) => setNewPayment((f) => ({ ...f, note: e.target.value }))} />
            </label>
            <Button type="submit" size="sm" disabled={busy || !newPayment.amount}>
              Add Payment
            </Button>
          </form>
        </div>
      ) : (
        <div style={{ marginTop: '0.75rem' }}>
          <Button type="button" size="sm" variant="ghost" disabled={busy || !registrationDate} onClick={generateMonths}>
            Generate Months Since Registration
          </Button>
          {!registrationDate && (
            <span style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)', marginLeft: '0.5rem' }}>
              Set a registration date above first.
            </span>
          )}

          {(enrollment.monthlyPayments || []).map((m) => {
            const paidDateValue = paidDateByMonth[m._id] ?? (m.dueDate ? toDateInputValue(m.dueDate) : toDateInputValue(new Date()));
            return (
              <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <span>
                  {m.month} — ₹{m.amount} {m.dueDate ? `· due ${new Date(m.dueDate).toLocaleDateString('en-IN')}` : ''}
                  {m.paid && m.paidDate ? ` · paid ${new Date(m.paidDate).toLocaleDateString('en-IN')}` : ''}
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <Badge tone={m.paid ? 'success' : 'accent'}>{m.paid ? 'Paid' : 'Due'}</Badge>
                  {!m.paid && (
                    <input
                      type="date"
                      value={paidDateValue}
                      onChange={(e) => setPaidDateByMonth((f) => ({ ...f, [m._id]: e.target.value }))}
                      style={{ padding: '0.3rem 0.4rem', fontSize: '0.8rem' }}
                    />
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => toggleMonthPaid(m._id, !m.paid, m.paid ? undefined : paidDateValue)}
                  >
                    Mark {m.paid ? 'Unpaid' : 'Paid'}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => removeMonth(m._id)}>
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
          <form onSubmit={addMonth} className={formStyles.row} style={{ marginTop: '0.4rem', alignItems: 'flex-end' }}>
            <label>
              Month
              <input type="month" value={newMonth.month} onChange={(e) => setNewMonth((f) => ({ ...f, month: e.target.value }))} />
            </label>
            <label>
              Amount (₹)
              <input type="number" min="0" value={newMonth.amount} onChange={(e) => setNewMonth((f) => ({ ...f, amount: e.target.value }))} />
            </label>
            <label>
              Due Date (optional)
              <input type="date" value={newMonth.dueDate} onChange={(e) => setNewMonth((f) => ({ ...f, dueDate: e.target.value }))} />
            </label>
            <Button type="submit" size="sm" disabled={busy || !newMonth.month}>
              Add Month
            </Button>
          </form>
        </div>
      )}

      {error && <p className={formStyles.errorMsg}>{error}</p>}
    </div>
  );
}

export default function StudentDetail() {
  const { studentId } = useParams();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useStudentDetailAnalytics(studentId);
  const [resetOpen, setResetOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const canResetAttempts = !user?.restrictedSections?.includes('tests');
  const canResetPassword = user?.canResetPasswords !== false;
  const isAdmin = user?.role === 'admin';

  const handleReset = async (attempt) => {
    if (!window.confirm(`Let this student retake "${attempt.testId?.title}"? Their current attempt will be archived, not deleted.`)) return;
    await testService.resetAttempt(attempt._id);
    await refetch();
  };

  const handleToggleStatus = async () => {
    const nextStatus = data.student.status === 'active' ? 'inactive' : 'active';
    if (nextStatus === 'inactive' && !window.confirm(`Deactivate ${data.student.name}? They won't be able to log in until reactivated.`)) return;
    setStatusBusy(true);
    try {
      await authService.updateStudentStatus(studentId, nextStatus);
      await refetch();
    } finally {
      setStatusBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete ${data.student.name}'s account? This cannot be undone.`)) return;
    await authService.removeStudent(studentId);
    window.location.href = '/dashboard/mentor/students';
  };

  return (
    <>
      <SEO title="Student Detail" description="Notes, tests, and analysis for this student." path="/dashboard/mentor" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h1 style={{ marginBottom: '0.15rem' }}>
                {data?.student?.name || 'Student Detail'}
                {data?.student?.status === 'inactive' && (
                  <span style={{ marginLeft: '0.5rem' }}>
                    <Badge tone="default">Deactivated</Badge>
                  </span>
                )}
              </h1>
              {data?.student && (
                <p style={{ color: 'var(--ap-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  {data.student.email} · {data.student.phone} · Joined{' '}
                  {new Date(data.student.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={() => setGrantOpen((v) => !v)}>
                  {grantOpen ? 'Close' : 'Grant Course Access'}
                </Button>
              )}
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={() => setAccessOpen((v) => !v)}>
                  {accessOpen ? 'Close' : 'Manage Access'}
                </Button>
              )}
              {canResetPassword && (
                <Button size="sm" variant="ghost" onClick={() => setResetOpen((v) => !v)}>
                  {resetOpen ? 'Close' : 'Reset Password'}
                </Button>
              )}
              {isAdmin && data?.student && (
                <Button size="sm" variant="ghost" disabled={statusBusy} onClick={handleToggleStatus}>
                  {data.student.status === 'active' ? 'Deactivate' : 'Reactivate'}
                </Button>
              )}
              {isAdmin && data?.student && (
                <Button size="sm" variant="danger" onClick={handleDelete}>
                  Delete Account
                </Button>
              )}
            </div>
          </div>
          {grantOpen && isAdmin && (
            <GrantAccessForm studentId={studentId} onDone={() => setGrantOpen(false)} onGranted={refetch} />
          )}
          {accessOpen && isAdmin && (
            <ManageAccessForm
              studentId={studentId}
              initialRestricted={data?.restrictedStudentAccess}
              onDone={() => setAccessOpen(false)}
              onSaved={refetch}
            />
          )}
          {resetOpen && canResetPassword && <ResetPasswordForm studentId={studentId} onDone={() => setResetOpen(false)} />}

            {loading && <Spinner label="Loading…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}

            {data && (
              <>
                <div className={dashboardStyles.statRow}>
                  <Stat value={data.enrollments.length} label="Courses Enrolled" />
                  <Stat value={data.testsAttemptedCount} label="Tests Attempted" />
                  <Stat value={data.averageScorePercent !== null ? `${data.averageScorePercent}%` : '—'} label="Avg Score" />
                  <Stat value={data.purchasedNotes.length} label="Premium Notes Bought" />
                </div>

                <h2 style={{ color: 'var(--ap-primary)' }}>Enrollments</h2>
                {data.enrollments.length === 0 ? (
                  <ErrorState message="No enrollments yet." />
                ) : (
                  <div className={dashboardStyles.tableWrap}>
                    <table className={dashboardStyles.table}>
                      <thead>
                        <tr>
                          <th>Course</th>
                          <th>Status</th>
                          <th>Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.enrollments.map((e) => (
                          <tr key={e._id}>
                            <td>{e.courseId?.title}</td>
                            <td>
                              <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                            </td>
                            <td>{e.status === 'active' || e.status === 'completed' ? `${e.progressPercent}%` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {data.enrollments.some((e) => e.courseId?.courseType === 'live') && (
                  <>
                    <h2 style={{ color: 'var(--ap-primary)' }}>Live Course Fees</h2>
                    {data.enrollments
                      .filter((e) => e.courseId?.courseType === 'live')
                      .map((e) => (
                        <EnrollmentFeeManager key={e._id} enrollment={e} onChanged={refetch} />
                      ))}
                  </>
                )}

                <h2 style={{ color: 'var(--ap-primary)' }}>Weak Chapters</h2>
                {data.weakChapters.length === 0 ? (
                  <ErrorState message="Not enough graded attempts yet to identify weak chapters." />
                ) : (
                  <div className={formStyles.card}>
                    {data.weakChapters.map((w) => (
                      <div key={w.chapter} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}>
                        <span>{w.chapter}</span>
                        <span style={{ color: 'var(--ap-text-muted)' }}>{w.mistakes} mistake(s)</span>
                      </div>
                    ))}
                  </div>
                )}

                <h2 style={{ color: 'var(--ap-primary)' }}>Test Attempts</h2>
                {data.attempts.length === 0 ? (
                  <ErrorState message="No test attempts yet." />
                ) : (
                  <div className={dashboardStyles.tableWrap}>
                    <table className={dashboardStyles.table}>
                      <thead>
                        <tr>
                          <th>Test</th>
                          <th>Status</th>
                          <th>Attempts</th>
                          <th>Score</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.attempts.map((a) => (
                          <tr key={a._id}>
                            <td>
                              {a.testId?.title} <Badge tone="default">{a.testId?.kind || 'test'}</Badge>
                            </td>
                            <td>{a.status}</td>
                            <td>
                              <Badge tone={a.attemptCount > 1 ? 'accent' : 'default'}>
                                {a.attemptCount} attempt{a.attemptCount === 1 ? '' : 's'}
                              </Badge>
                            </td>
                            <td>{a.status === 'submitted' ? `${a.score} / ${a.maxScore}` : '—'}</td>
                            <td>
                              {a.status === 'submitted' && canResetAttempts && (
                                <Button size="sm" variant="ghost" onClick={() => handleReset(a)}>
                                  Reset Attempt
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h2 style={{ color: 'var(--ap-primary)' }}>Premium Notes Purchased</h2>
                {data.purchasedNotes.length === 0 ? (
                  <ErrorState message="No premium notes purchased yet." />
                ) : (
                  <div className={formStyles.card}>
                    {data.purchasedNotes.map((n) => (
                      <div key={n._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}>
                        <span>{n.title}</span>
                        <span style={{ color: 'var(--ap-text-muted)' }}>{formatPrice(n.price, n.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
        </div>
      </DashboardLayout>
    </>
  );
}
