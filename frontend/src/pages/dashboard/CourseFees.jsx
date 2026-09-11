import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { courseFeesService } from '../../services/courseFeesService.js';
import { courseService } from '../../services/courseService.js';
import { EXAM_TRACKS } from '../../data/examTracks.js';
import styles from './CourseFees.module.css';

function money(n) {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatMonth(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function slugify(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function Field({ label, wide, children }) {
  return (
    <div className={`${styles.field} ${wide ? styles.fieldWide : ''}`}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </div>
  );
}

function CourseSelect({ courses, value, onChange }) {
  return (
    <select className={styles.input} required value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>
        Select a course…
      </option>
      {courses.map((c) => (
        <option key={c._id} value={c._id}>
          {c.title}
        </option>
      ))}
    </select>
  );
}

function NewCourseMiniForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ title: '', track: EXAM_TRACKS[0].key, tagline: '', description: '', price: '', durationWeeks: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // A plain button + onClick, not a <form onSubmit>, since this renders
  // inside NewBatchForm/BatchEditForm's own <form> — a nested <form> is
  // invalid HTML and silently misroutes the native submit to the outer one.
  const submit = async () => {
    if (!form.title.trim() || !form.tagline.trim() || !form.description.trim() || !form.price || !form.durationWeeks) return;
    setBusy(true);
    setError('');
    try {
      const created = await courseService.create({
        slug: slugify(form.title) || `course-${Date.now()}`,
        title: form.title.trim(),
        track: form.track,
        tagline: form.tagline.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        durationWeeks: Number(form.durationWeeks),
      });
      onCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.miniForm}>
      <div className={styles.fieldGrid}>
        <Field label="Course title" wide>
          <input className={styles.input} required value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. NEET 2028 Live Batch" />
        </Field>
        <Field label="Track">
          <select className={styles.input} value={form.track} onChange={(e) => set({ track: e.target.value })}>
            {EXAM_TRACKS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Price">
          <input className={styles.input} required type="number" min="0" value={form.price} onChange={(e) => set({ price: e.target.value })} />
        </Field>
        <Field label="Duration (weeks)">
          <input className={styles.input} required type="number" min="1" value={form.durationWeeks} onChange={(e) => set({ durationWeeks: e.target.value })} />
        </Field>
        <Field label="Tagline" wide>
          <input className={styles.input} required value={form.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="One line describing the course" />
        </Field>
        <Field label="Description" wide>
          <textarea className={styles.input} required rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
      </div>
      <div className={styles.formActions}>
        <Button type="button" size="sm" disabled={busy} onClick={submit}>
          {busy ? 'Creating…' : 'Create course'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
      {error && <p className={styles.feedbackErr}>{error}</p>}
    </div>
  );
}

function CoursePicker({ courses, value, onChange, onCourseCreated }) {
  const [creating, setCreating] = useState(false);

  if (creating) {
    return (
      <NewCourseMiniForm
        onCreated={(course) => {
          onCourseCreated(course);
          onChange(course._id);
          setCreating(false);
        }}
        onCancel={() => setCreating(false)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <CourseSelect courses={courses} value={value} onChange={onChange} />
      <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(true)}>
        + New course
      </Button>
    </div>
  );
}

function NewBatchForm({ courses, onCourseCreated, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    courseId: '',
    standardFee: '',
    classHoursPerWeek: '',
    doubtsPerWeek: '',
    testsConducted: '',
    sheetsNotesProvided: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.courseId) return;
    setBusy(true);
    setError('');
    try {
      await courseFeesService.createBatch({
        ...form,
        classHoursPerWeek: Number(form.classHoursPerWeek) || 0,
        doubtsPerWeek: Number(form.doubtsPerWeek) || 0,
        testsConducted: Number(form.testsConducted) || 0,
        sheetsNotesProvided: Number(form.sheetsNotesProvided) || 0,
      });
      setForm({ courseId: '', standardFee: '', classHoursPerWeek: '', doubtsPerWeek: '', testsConducted: '', sheetsNotesProvided: '', notes: '' });
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div className={styles.panelTitle}>Add a course batch</div>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? 'Close' : 'Open'}
        </Button>
      </div>
      {open && (
        <form onSubmit={submit}>
          <Field label="Course" wide>
            <CoursePicker courses={courses} value={form.courseId} onChange={(courseId) => set({ courseId })} onCourseCreated={onCourseCreated} />
          </Field>
          <div className={styles.fieldGrid} style={{ marginTop: '0.75rem' }}>
            <Field label="Standard course fee (optional)">
              <input
                className={styles.input}
                type="number"
                min="0"
                placeholder="leave blank if it varies"
                value={form.standardFee}
                onChange={(e) => set({ standardFee: e.target.value })}
              />
            </Field>
            <Field label="Class hours / week">
              <input className={styles.input} type="number" min="0" value={form.classHoursPerWeek} onChange={(e) => set({ classHoursPerWeek: e.target.value })} />
            </Field>
            <Field label="Doubt sessions / week">
              <input className={styles.input} type="number" min="0" value={form.doubtsPerWeek} onChange={(e) => set({ doubtsPerWeek: e.target.value })} />
            </Field>
            <Field label="Tests conducted">
              <input className={styles.input} type="number" min="0" value={form.testsConducted} onChange={(e) => set({ testsConducted: e.target.value })} />
            </Field>
            <Field label="Sheets & notes provided">
              <input className={styles.input} type="number" min="0" value={form.sheetsNotesProvided} onChange={(e) => set({ sheetsNotesProvided: e.target.value })} />
            </Field>
            <Field label="Notes (optional)" wide>
              <input className={styles.input} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            </Field>
          </div>
          <div className={styles.formActions}>
            <Button type="submit" size="sm" disabled={busy || !form.courseId}>
              {busy ? 'Adding…' : 'Add batch'}
            </Button>
          </div>
          {error && <p className={styles.feedbackErr}>{error}</p>}
        </form>
      )}
    </div>
  );
}

function BatchEditForm({ batch, courses, onCourseCreated, onSaved, onCancel }) {
  const [form, setForm] = useState({
    courseId: batch.courseId,
    standardFee: batch.standardFee ?? '',
    classHoursPerWeek: batch.classHoursPerWeek,
    doubtsPerWeek: batch.doubtsPerWeek,
    testsConducted: batch.testsConducted,
    sheetsNotesProvided: batch.sheetsNotesProvided,
    notes: batch.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await courseFeesService.updateBatch(batch._id, {
        ...form,
        classHoursPerWeek: Number(form.classHoursPerWeek) || 0,
        doubtsPerWeek: Number(form.doubtsPerWeek) || 0,
        testsConducted: Number(form.testsConducted) || 0,
        sheetsNotesProvided: Number(form.sheetsNotesProvided) || 0,
      });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Field label="Course" wide>
        <CoursePicker courses={courses} value={form.courseId} onChange={(courseId) => set({ courseId })} onCourseCreated={onCourseCreated} />
      </Field>
      <div className={styles.fieldGrid} style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
        <Field label="Standard course fee (optional)">
          <input className={styles.input} type="number" min="0" placeholder="leave blank if it varies" value={form.standardFee} onChange={(e) => set({ standardFee: e.target.value })} />
        </Field>
        <Field label="Class hours / week">
          <input className={styles.input} type="number" min="0" value={form.classHoursPerWeek} onChange={(e) => set({ classHoursPerWeek: e.target.value })} />
        </Field>
        <Field label="Doubt sessions / week">
          <input className={styles.input} type="number" min="0" value={form.doubtsPerWeek} onChange={(e) => set({ doubtsPerWeek: e.target.value })} />
        </Field>
        <Field label="Tests conducted">
          <input className={styles.input} type="number" min="0" value={form.testsConducted} onChange={(e) => set({ testsConducted: e.target.value })} />
        </Field>
        <Field label="Sheets & notes provided">
          <input className={styles.input} type="number" min="0" value={form.sheetsNotesProvided} onChange={(e) => set({ sheetsNotesProvided: e.target.value })} />
        </Field>
        <Field label="Notes" wide>
          <input className={styles.input} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        {error && <p className={styles.feedbackErr}>{error}</p>}
      </div>
    </form>
  );
}

function AddStudentForm({ batchId, standardFee, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    feeType: 'one-time',
    name: '',
    contact: '',
    totalFee: standardFee != null ? String(standardFee) : '',
    monthlyFee: '',
    securityAmount: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await courseFeesService.createStudent(batchId, {
        ...form,
        totalFee: Number(form.totalFee) || 0,
        monthlyFee: Number(form.monthlyFee) || 0,
        securityAmount: Number(form.securityAmount) || 0,
      });
      setForm({ feeType: 'one-time', name: '', contact: '', totalFee: standardFee != null ? String(standardFee) : '', monthlyFee: '', securityAmount: '' });
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        + Add student
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className={styles.studentAddForm}>
      <div className={styles.studentForm}>
        <select className={styles.input} value={form.feeType} onChange={(e) => set({ feeType: e.target.value })}>
          <option value="one-time">Pays one-time</option>
          <option value="monthly">Pays monthly</option>
        </select>
        <input className={`${styles.input} ${styles.inputSm}`} required placeholder="Student name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
        <input className={`${styles.input} ${styles.inputSm}`} placeholder="Contact (optional)" value={form.contact} onChange={(e) => set({ contact: e.target.value })} />
      </div>
      <div className={styles.studentForm}>
        {form.feeType === 'one-time' ? (
          <input
            className={`${styles.input} ${styles.inputXs}`}
            type="number"
            min="0"
            placeholder="Total fee"
            value={form.totalFee}
            onChange={(e) => set({ totalFee: e.target.value })}
          />
        ) : (
          <input
            className={`${styles.input} ${styles.inputXs}`}
            type="number"
            min="0"
            placeholder="Fee per month"
            value={form.monthlyFee}
            onChange={(e) => set({ monthlyFee: e.target.value })}
          />
        )}
        <input
          className={`${styles.input} ${styles.inputXs}`}
          type="number"
          min="0"
          placeholder="Security amount"
          value={form.securityAmount}
          onChange={(e) => set({ securityAmount: e.target.value })}
        />
        <Button type="submit" size="sm" disabled={busy || !form.name.trim()}>
          {busy ? 'Adding…' : 'Add'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
      {error && <p className={styles.feedbackErr}>{error}</p>}
    </form>
  );
}

function AddPaymentForm({ studentId, onAdded, onDone }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setBusy(true);
    setError('');
    try {
      await courseFeesService.addPayment(studentId, { amount: Number(amount), date, note });
      setAmount('');
      setNote('');
      onAdded();
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={styles.paymentForm}>
      <input className={`${styles.input} ${styles.inputXs}`} type="number" min="0" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <input className={`${styles.input} ${styles.inputSm}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      <input className={`${styles.input} ${styles.inputSm}`} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button type="submit" size="sm" disabled={busy || !amount}>
        {busy ? 'Saving…' : 'Record payment'}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={busy}>
        Cancel
      </Button>
      {error && <p className={styles.feedbackErr}>{error}</p>}
    </form>
  );
}

function AddMonthForm({ studentId, defaultAmount, onAdded, onDone }) {
  const [month, setMonth] = useState(currentMonth());
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
  const [paid, setPaid] = useState(false);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!month) return;
    setBusy(true);
    setError('');
    try {
      await courseFeesService.addMonth(studentId, { month, amount: Number(amount) || 0, paid, paidDate: paid ? paidDate : undefined });
      onAdded();
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={styles.paymentForm}>
      <input className={`${styles.input} ${styles.inputSm}`} type="month" value={month} onChange={(e) => setMonth(e.target.value)} required />
      <input className={`${styles.input} ${styles.inputXs}`} type="number" min="0" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <label className={styles.checkboxLabel}>
        <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Already paid
      </label>
      {paid && <input className={`${styles.input} ${styles.inputSm}`} type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />}
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? 'Saving…' : 'Add month'}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={busy}>
        Cancel
      </Button>
      {error && <p className={styles.feedbackErr}>{error}</p>}
    </form>
  );
}

function MonthRow({ studentId, entry, onChanged }) {
  const [markingPaid, setMarkingPaid] = useState(false);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const confirmPaid = async () => {
    setBusy(true);
    try {
      await courseFeesService.updateMonth(studentId, entry._id, { paid: true, paidDate });
      onChanged();
    } finally {
      setBusy(false);
      setMarkingPaid(false);
    }
  };

  const revertToPending = async () => {
    if (!window.confirm(`Mark ${formatMonth(entry.month)} back as pending?`)) return;
    await courseFeesService.updateMonth(studentId, entry._id, { paid: false });
    onChanged();
  };

  const remove = async () => {
    if (!window.confirm(`Remove the ${formatMonth(entry.month)} entry?`)) return;
    await courseFeesService.removeMonth(studentId, entry._id);
    onChanged();
  };

  return (
    <li className={styles.monthItem}>
      <span className={styles.monthLabel}>{formatMonth(entry.month)}</span>
      <span className={styles.paymentAmount}>{money(entry.amount)}</span>
      {entry.paid ? (
        <>
          <span className={styles.monthBadgePaid}>Paid {formatDate(entry.paidDate)}</span>
          <button type="button" className={styles.editLink} onClick={revertToPending}>
            Undo
          </button>
        </>
      ) : markingPaid ? (
        <>
          <input className={`${styles.input} ${styles.inputSm}`} type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
          <Button type="button" size="sm" disabled={busy} onClick={confirmPaid}>
            Confirm
          </Button>
          <button type="button" className={styles.editLink} onClick={() => setMarkingPaid(false)}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className={styles.monthBadgePending}>Pending</span>
          <button type="button" className={styles.editLink} onClick={() => setMarkingPaid(true)}>
            Mark paid
          </button>
        </>
      )}
      <button type="button" className={styles.editLink} onClick={remove}>
        Remove
      </button>
    </li>
  );
}

function StudentRow({ student, onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: student.name,
    contact: student.contact || '',
    totalFee: student.totalFee,
    monthlyFee: student.monthlyFee,
    securityAmount: student.securityAmount,
    securityPaid: student.securityPaid,
  });
  const [busy, setBusy] = useState(false);
  const isMonthly = student.feeType === 'monthly';

  const saveEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await courseFeesService.updateStudent(student._id, {
        ...editForm,
        totalFee: Number(editForm.totalFee) || 0,
        monthlyFee: Number(editForm.monthlyFee) || 0,
        securityAmount: Number(editForm.securityAmount) || 0,
        securityPaid: Number(editForm.securityPaid) || 0,
      });
      setEditing(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const removeStudent = async () => {
    if (!window.confirm(`Remove ${student.name} from this batch?`)) return;
    await courseFeesService.removeStudent(student._id);
    onChanged();
  };

  const removePayment = async (paymentId) => {
    if (!window.confirm('Remove this payment record?')) return;
    await courseFeesService.removePayment(student._id, paymentId);
    onChanged();
  };

  return (
    <div className={styles.studentRow}>
      {editing ? (
        <form onSubmit={saveEdit} className={styles.studentForm}>
          <input className={`${styles.input} ${styles.inputSm}`} required value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          <input className={`${styles.input} ${styles.inputSm}`} value={editForm.contact} onChange={(e) => setEditForm((f) => ({ ...f, contact: e.target.value }))} placeholder="Contact" />
          {isMonthly ? (
            <input
              className={`${styles.input} ${styles.inputXs}`}
              type="number"
              min="0"
              placeholder="Fee per month"
              value={editForm.monthlyFee}
              onChange={(e) => setEditForm((f) => ({ ...f, monthlyFee: e.target.value }))}
            />
          ) : (
            <input
              className={`${styles.input} ${styles.inputXs}`}
              type="number"
              min="0"
              placeholder="Total fee"
              value={editForm.totalFee}
              onChange={(e) => setEditForm((f) => ({ ...f, totalFee: e.target.value }))}
            />
          )}
          <input
            className={`${styles.input} ${styles.inputXs}`}
            type="number"
            min="0"
            placeholder="Security agreed"
            value={editForm.securityAmount}
            onChange={(e) => setEditForm((f) => ({ ...f, securityAmount: e.target.value }))}
          />
          <input
            className={`${styles.input} ${styles.inputXs}`}
            type="number"
            min="0"
            placeholder="Security collected"
            value={editForm.securityPaid}
            onChange={(e) => setEditForm((f) => ({ ...f, securityPaid: e.target.value }))}
          />
          <Button type="submit" size="sm" disabled={busy}>
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
            Cancel
          </Button>
        </form>
      ) : (
        <div className={styles.studentSummary}>
          <button type="button" className={styles.studentName} onClick={() => setExpanded((v) => !v)}>
            {expanded ? '▾' : '▸'} {student.name}
          </button>
          {student.contact && <span className={styles.tileSub}>{student.contact}</span>}
          <Badge tone={isMonthly ? 'accent' : 'default'}>{isMonthly ? `${money(student.monthlyFee)}/mo` : 'One-time'}</Badge>
          <span className={styles.studentFee}>{money(student.feeTotal)}</span>
          <span className={styles.studentPaid}>{money(student.feePaid)} paid</span>
          <span className={student.feeDue > 0 ? styles.studentDue : styles.studentDueClear}>
            {student.feeDue > 0 ? `${money(student.feeDue)} due` : 'Cleared'}
          </span>
          {student.securityAmount > 0 && (
            <span className={styles.tileSub}>
              Security {money(student.securityPaid)}/{money(student.securityAmount)}
            </span>
          )}
          <button type="button" className={styles.editLink} onClick={() => setEditing(true)}>
            Edit
          </button>
          <button type="button" className={styles.editLink} onClick={removeStudent}>
            Remove
          </button>
        </div>
      )}

      {expanded && !editing && (
        <div className={styles.paymentLog}>
          {isMonthly ? (
            <>
              {student.monthlyPayments.length === 0 ? (
                <p className={styles.tileSub}>No months added yet.</p>
              ) : (
                <ul className={styles.months}>
                  {[...student.monthlyPayments]
                    .sort((a, b) => a.month.localeCompare(b.month))
                    .map((m) => (
                      <MonthRow key={m._id} studentId={student._id} entry={m} onChanged={onChanged} />
                    ))}
                </ul>
              )}
              {addingPayment ? (
                <AddMonthForm studentId={student._id} defaultAmount={student.monthlyFee} onAdded={onChanged} onDone={() => setAddingPayment(false)} />
              ) : (
                <Button type="button" size="sm" variant="ghost" onClick={() => setAddingPayment(true)}>
                  + Add month
                </Button>
              )}
            </>
          ) : (
            <>
              {student.payments.length === 0 ? (
                <p className={styles.tileSub}>No payments recorded yet.</p>
              ) : (
                <ul className={styles.payments}>
                  {student.payments.map((p) => (
                    <li key={p._id} className={styles.paymentItem}>
                      <span>{formatDate(p.date)}</span>
                      <span className={styles.paymentAmount}>{money(p.amount)}</span>
                      {p.note && <span className={styles.tileSub}>{p.note}</span>}
                      <button type="button" className={styles.editLink} onClick={() => removePayment(p._id)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {addingPayment ? (
                <AddPaymentForm studentId={student._id} onAdded={onChanged} onDone={() => setAddingPayment(false)} />
              ) : (
                <Button type="button" size="sm" variant="ghost" onClick={() => setAddingPayment(true)}>
                  + Record payment
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BatchCard({ batch, courses, onCourseCreated, onChanged }) {
  const [editing, setEditing] = useState(false);
  const courseTitle = batch.course?.title || 'Unknown course';

  const removeBatch = async () => {
    if (!window.confirm(`Delete "${courseTitle}" and every student/payment under it?`)) return;
    await courseFeesService.removeBatch(batch._id);
    onChanged();
  };

  return (
    <section className={styles.batch}>
      {editing ? (
        <BatchEditForm
          batch={batch}
          courses={courses}
          onCourseCreated={onCourseCreated}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div className={styles.batchHead}>
            <span className={styles.batchName}>
              {courseTitle}
              {batch.standardFee != null && <Badge tone="default">Standard {money(batch.standardFee)}</Badge>}
              <button type="button" className={styles.editLink} onClick={() => setEditing(true)}>
                Edit
              </button>
              <button type="button" className={styles.editLink} onClick={removeBatch}>
                Delete
              </button>
            </span>
            <span className={styles.batchStats}>
              {batch.studentCount} student{batch.studentCount === 1 ? '' : 's'} · {money(batch.totalPaid)} collected
              {batch.totalDue > 0 ? ` · ${money(batch.totalDue)} due` : ' · fully paid'}
            </span>
          </div>

          <div className={styles.opsRow}>
            <span>
              <strong>{batch.classHoursPerWeek}</strong> class hrs/wk
            </span>
            <span>
              <strong>{batch.doubtsPerWeek}</strong> doubt sessions/wk
            </span>
            <span>
              <strong>{batch.testsConducted}</strong> tests conducted
            </span>
            <span>
              <strong>{batch.sheetsNotesProvided}</strong> sheets/notes provided
            </span>
          </div>
          {batch.notes && <p className={styles.batchNotes}>{batch.notes}</p>}
        </>
      )}

      <p className={styles.sectionLabel}>Students</p>
      {batch.students.length === 0 ? (
        <p className={styles.empty}>No students added yet.</p>
      ) : (
        <div className={styles.students}>
          {batch.students.map((s) => (
            <StudentRow key={s._id} student={s} onChanged={onChanged} />
          ))}
        </div>
      )}
      <div style={{ marginTop: '0.5rem' }}>
        <AddStudentForm batchId={batch._id} standardFee={batch.standardFee} onCreated={onChanged} />
      </div>
    </section>
  );
}

export default function CourseFees() {
  const [data, setData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = async () => {
    setLoading(true);
    setError('');
    try {
      const [feeData, courseList] = await Promise.all([courseFeesService.listBatches(), courseService.getAllForMentor()]);
      setData(feeData);
      setCourses(courseList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  const handleCourseCreated = (course) => setCourses((prev) => [...prev, course]);

  return (
    <>
      <SEO title="Course Fees" description="Manual fee tracking for your own live Angular Physics courses." path="/dashboard/mentor/course-fees" />
      <DashboardLayout role="mentor">
        <div className={styles.wrap}>
          <h1>Course Fees</h1>
          <p className={styles.lede}>
            Fee tracking for your own live courses — registration, one-time/monthly fees, and security deposits, kept separate from the
            site's automated checkout. Back to the <Link to="/dashboard/mentor">dashboard</Link>.
          </p>

          {!loading && !error && data && (
            <div className={styles.summaryRow}>
              <div className={styles.summaryTile}>
                <span className={styles.summaryValue}>{data.summary.totalStudents}</span>
                <span className={styles.tileLabel}>Students</span>
              </div>
              <div className={styles.summaryTile}>
                <span className={styles.summaryValue}>{money(data.summary.totalFees)}</span>
                <span className={styles.tileLabel}>Total fees</span>
              </div>
              <div className={`${styles.summaryTile} ${styles.summaryOk}`}>
                <span className={styles.summaryValue}>{money(data.summary.totalPaid)}</span>
                <span className={styles.tileLabel}>Collected</span>
              </div>
              <div className={`${styles.summaryTile} ${data.summary.totalDue > 0 ? styles.summaryWarn : ''}`}>
                <span className={styles.summaryValue}>{money(data.summary.totalDue)}</span>
                <span className={styles.tileLabel}>Due</span>
              </div>
            </div>
          )}

          <NewBatchForm courses={courses} onCourseCreated={handleCourseCreated} onCreated={refetch} />

          {loading && <Spinner />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && data?.batches.length === 0 && <p className={styles.empty}>No course batches yet — add one above.</p>}

          {!loading &&
            !error &&
            data?.batches.map((batch) => (
              <BatchCard key={batch._id} batch={batch} courses={courses} onCourseCreated={handleCourseCreated} onChanged={refetch} />
            ))}
        </div>
      </DashboardLayout>
    </>
  );
}
