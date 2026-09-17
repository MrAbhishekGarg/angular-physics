import { useEffect, useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import { useStudentBatches } from '../../hooks/useStudentBatches.js';
import { useStudentsOverview } from '../../hooks/useEnrollments.js';
import { studentBatchService } from '../../services/studentBatchService.js';
import formStyles from './DashboardForm.module.css';
import styles from './StudentBatches.module.css';

const PAGE_SIZE = 20;

function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function MembershipPanel({ batch, students, onSaved }) {
  const [selected, setSelected] = useState((batch.studentIds || []).map((s) => (typeof s === 'string' ? s : s._id)));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  const totalStudents = (students || []).length;
  const filtered = (students || []).filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 3000);
    return () => clearTimeout(t);
  }, [justSaved]);

  const toggle = (studentId) => {
    setJustSaved(false);
    setSelected((ids) => (ids.includes(studentId) ? ids.filter((id) => id !== studentId) : [...ids, studentId]));
  };

  const handleSave = async () => {
    setBusy(true);
    setSaveError('');
    try {
      await studentBatchService.setStudents(batch._id, selected);
      await onSaved();
      setJustSaved(true);
    } catch (err) {
      setSaveError(err.message || 'Could not save membership — try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <Badge tone={selected.length > 0 ? 'success' : 'default'}>
          {selected.length} of {totalStudents} student{totalStudents === 1 ? '' : 's'} selected
        </Badge>
        {totalStudents > 0 && selected.length === totalStudents && (
          <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>Every registered student is already in this batch.</span>
        )}
      </div>

      <div className={styles.searchWrap}>
        <span className={styles.searchIcon} aria-hidden="true">
          🔍
        </span>
        <input
          className={styles.searchInput}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search students by name or email…"
        />
      </div>

      <div className={styles.studentList}>
        {totalStudents === 0 && <p className={styles.emptyNote}>No registered students yet.</p>}
        {totalStudents > 0 && paged.length === 0 && <p className={styles.emptyNote}>No students match "{search}".</p>}
        {paged.map((s) => (
          <label key={s._id} className={styles.studentRow}>
            <input type="checkbox" checked={selected.includes(s._id)} onChange={() => toggle(s._id)} />
            {s.name} <span className={styles.studentEmail}>({s.email})</span>
          </label>
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <div className={styles.saveRow}>
        <Button size="sm" disabled={busy} onClick={handleSave}>
          {busy ? 'Saving…' : 'Save Membership'}
        </Button>
        {justSaved && <span className={styles.savedTick}>✓ Saved</span>}
      </div>
      {saveError && <p className={formStyles.errorMsg}>{saveError}</p>}
    </div>
  );
}

export default function StudentBatches() {
  const { data: batches, loading, error, refetch } = useStudentBatches();
  const { data: students } = useStudentsOverview();
  const [form, setForm] = useState({ name: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [editError, setEditError] = useState('');
  const [rowBusy, setRowBusy] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await studentBatchService.create(form);
      setForm({ name: '', description: '' });
      await refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (batch) => {
    setEditingId(batch._id);
    setEditError('');
    setEditForm({ name: batch.name, description: batch.description || '' });
  };

  const handleRename = async (id) => {
    setRowBusy(id);
    setEditError('');
    try {
      await studentBatchService.update(id, editForm);
      setEditingId(null);
      await refetch();
    } catch (err) {
      setEditError(err.message || 'Could not save changes — try again.');
    } finally {
      setRowBusy(null);
    }
  };

  const handleDelete = async (batch) => {
    if (!window.confirm(`Delete batch "${batch.name}"? This does not delete the students, only the grouping.`)) return;
    setRowBusy(batch._id);
    try {
      await studentBatchService.remove(batch._id);
      await refetch();
    } catch (err) {
      window.alert(err.message || 'Could not delete this batch — try again.');
    } finally {
      setRowBusy(null);
    }
  };

  return (
    <>
      <SEO title="Manage Batches" description="Form batches of registered students to target notes and worksheets." path="/dashboard/mentor/batches" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <h1>🗂️ Manage Batches</h1>
          <p style={{ color: 'var(--ap-text-muted)' }}>
            A batch is a named group of your registered students, independent of which course(s) they're enrolled
            in — group them however makes sense (e.g. "NEET 2027 Morning", "Scholarship Batch"), then target a note
            or worksheet at a batch from its Assign panel.
          </p>

          {loading && <Spinner label="Loading batches…" />}
          {error && <ErrorState message={error} onRetry={refetch} />}

          {batches && (
            <div style={{ marginBottom: 'var(--ap-space-lg)' }}>
              {batches.length === 0 ? (
                <p style={{ color: 'var(--ap-text-muted)' }}>No batches yet — create your first one below.</p>
              ) : (
                batches.map((batch) => {
                  const count = (batch.studentIds || []).length;
                  return (
                    <div key={batch._id} className={`${formStyles.card} ${styles.card}`}>
                      <div className={styles.cardTop}>
                        <div className={styles.avatar}>{initialsOf(batch.name)}</div>
                        <div className={styles.titleBlock}>
                          {editingId === batch._id ? (
                            <input
                              value={editForm.name}
                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                              style={{ width: '100%' }}
                            />
                          ) : (
                            <div className={styles.titleRow}>
                              <strong>{batch.name}</strong>
                              <Badge tone="launching">
                                {count} student{count === 1 ? '' : 's'}
                              </Badge>
                            </div>
                          )}
                          {editingId === batch._id ? (
                            <textarea
                              rows="2"
                              value={editForm.description}
                              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                              style={{ width: '100%', marginTop: '0.4rem' }}
                            />
                          ) : (
                            batch.description && <p className={styles.description}>{batch.description}</p>
                          )}
                        </div>
                      </div>

                      <div className={styles.actions}>
                        {editingId === batch._id ? (
                          <>
                            <Button size="sm" disabled={rowBusy === batch._id} onClick={() => handleRename(batch._id)}>
                              {rowBusy === batch._id ? 'Saving…' : 'Save'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setExpandedId((id) => (id === batch._id ? null : batch._id))}>
                              {expandedId === batch._id ? 'Close' : 'Manage Students'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => startEdit(batch)}>
                              Rename / Edit
                            </Button>
                            <Button size="sm" variant="danger" disabled={rowBusy === batch._id} onClick={() => handleDelete(batch)}>
                              {rowBusy === batch._id ? 'Deleting…' : 'Delete'}
                            </Button>
                          </>
                        )}
                      </div>
                      {editingId === batch._id && editError && <p className={formStyles.errorMsg}>{editError}</p>}

                      {expandedId === batch._id && <MembershipPanel batch={batch} students={students} onSaved={refetch} />}
                    </div>
                  );
                })
              )}
            </div>
          )}

          <h2 style={{ color: 'var(--ap-primary)', marginBottom: 'var(--ap-space-sm)' }}>Create a Batch</h2>
          <form className={formStyles.form} onSubmit={handleCreate}>
            <label>
              Name
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. NEET 2027 Morning" />
            </label>
            <label>
              Description (optional)
              <textarea
                rows="2"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <div className={formStyles.actions}>
              <Button type="submit" disabled={busy}>
                {busy ? 'Creating…' : 'Create Batch'}
              </Button>
            </div>
            {formError && <p className={formStyles.errorMsg}>{formError}</p>}
          </form>
        </div>
      </DashboardLayout>
    </>
  );
}
