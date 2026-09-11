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
import styles from './CourseFees.module.css';

function money(n) {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

function NewBatchForm({ courses, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    courseId: '',
    feeType: 'one-time',
    monthlyAmount: '',
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
        monthlyAmount: Number(form.monthlyAmount) || 0,
        classHoursPerWeek: Number(form.classHoursPerWeek) || 0,
        doubtsPerWeek: Number(form.doubtsPerWeek) || 0,
        testsConducted: Number(form.testsConducted) || 0,
        sheetsNotesProvided: Number(form.sheetsNotesProvided) || 0,
      });
      setForm({
        courseId: '',
        feeType: 'one-time',
        monthlyAmount: '',
        classHoursPerWeek: '',
        doubtsPerWeek: '',
        testsConducted: '',
        sheetsNotesProvided: '',
        notes: '',
      });
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
      {open && courses.length === 0 && (
        <p className={styles.tileSub}>
          No courses in the catalog yet — add one under <Link to="/dashboard/mentor">Manage Courses</Link> first.
        </p>
      )}
      {open && courses.length > 0 && (
        <form onSubmit={submit}>
          <div className={styles.fieldGrid}>
            <Field label="Course" wide>
              <CourseSelect courses={courses} value={form.courseId} onChange={(courseId) => set({ courseId })} />
            </Field>
            <Field label="Fee type">
              <select className={styles.input} value={form.feeType} onChange={(e) => set({ feeType: e.target.value })}>
                <option value="one-time">One-time</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
            {form.feeType === 'monthly' && (
              <Field label="Monthly amount">
                <input className={styles.input} type="number" min="0" value={form.monthlyAmount} onChange={(e) => set({ monthlyAmount: e.target.value })} />
              </Field>
            )}
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

function BatchEditForm({ batch, courses, onSaved, onCancel }) {
  const [form, setForm] = useState({
    courseId: batch.courseId,
    feeType: batch.feeType,
    monthlyAmount: batch.monthlyAmount,
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
        monthlyAmount: Number(form.monthlyAmount) || 0,
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
    <form onSubmit={submit} className={styles.fieldGrid} style={{ marginBottom: '0.75rem' }}>
      <Field label="Course" wide>
        <CourseSelect courses={courses} value={form.courseId} onChange={(courseId) => set({ courseId })} />
      </Field>
      <Field label="Fee type">
        <select className={styles.input} value={form.feeType} onChange={(e) => set({ feeType: e.target.value })}>
          <option value="one-time">One-time</option>
          <option value="monthly">Monthly</option>
        </select>
      </Field>
      {form.feeType === 'monthly' && (
        <Field label="Monthly amount">
          <input className={styles.input} type="number" min="0" value={form.monthlyAmount} onChange={(e) => set({ monthlyAmount: e.target.value })} />
        </Field>
      )}
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
      <div className={styles.fieldWide} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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

function AddStudentForm({ batchId, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', totalFee: '', securityAmount: '', notes: '' });
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
        securityAmount: Number(form.securityAmount) || 0,
      });
      setForm({ name: '', contact: '', totalFee: '', securityAmount: '', notes: '' });
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
    <form onSubmit={submit} className={styles.studentForm}>
      <input className={`${styles.input} ${styles.inputSm}`} required placeholder="Student name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
      <input className={`${styles.input} ${styles.inputSm}`} placeholder="Contact (optional)" value={form.contact} onChange={(e) => set({ contact: e.target.value })} />
      <input
        className={`${styles.input} ${styles.inputXs}`}
        type="number"
        min="0"
        placeholder="Total fee"
        value={form.totalFee}
        onChange={(e) => set({ totalFee: e.target.value })}
      />
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

function StudentRow({ student, onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: student.name,
    contact: student.contact || '',
    totalFee: student.totalFee,
    securityAmount: student.securityAmount,
    securityPaid: student.securityPaid,
  });
  const [busy, setBusy] = useState(false);

  const saveEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await courseFeesService.updateStudent(student._id, {
        ...editForm,
        totalFee: Number(editForm.totalFee) || 0,
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
          <input
            className={`${styles.input} ${styles.inputXs}`}
            type="number"
            min="0"
            placeholder="Total fee"
            value={editForm.totalFee}
            onChange={(e) => setEditForm((f) => ({ ...f, totalFee: e.target.value }))}
          />
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
          <span className={styles.studentFee}>{money(student.totalFee)}</span>
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
        </div>
      )}
    </div>
  );
}

function BatchCard({ batch, courses, onChanged }) {
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
              <Badge tone={batch.feeType === 'monthly' ? 'accent' : 'default'}>
                {batch.feeType === 'monthly' ? `Monthly · ${money(batch.monthlyAmount)}/mo` : 'One-time'}
              </Badge>
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
        <AddStudentForm batchId={batch._id} onCreated={onChanged} />
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

          <NewBatchForm courses={courses} onCreated={refetch} />

          {loading && <Spinner />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && data?.batches.length === 0 && <p className={styles.empty}>No course batches yet — add one above.</p>}

          {!loading && !error && data?.batches.map((batch) => <BatchCard key={batch._id} batch={batch} courses={courses} onChanged={refetch} />)}
        </div>
      </DashboardLayout>
    </>
  );
}
