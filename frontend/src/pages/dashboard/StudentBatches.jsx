import { useState } from 'react';
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

const PAGE_SIZE = 20;

function MembershipPanel({ batch, students, onSaved }) {
  const [selected, setSelected] = useState((batch.studentIds || []).map((s) => (typeof s === 'string' ? s : s._id)));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  const filtered = (students || []).filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggle = (studentId) => {
    setSelected((ids) => (ids.includes(studentId) ? ids.filter((id) => id !== studentId) : [...ids, studentId]));
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await studentBatchService.setStudents(batch._id, selected);
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <p style={{ fontSize: '0.82rem', color: 'var(--ap-text-muted)', marginBottom: '0.3rem' }}>
        {selected.length} student{selected.length === 1 ? '' : 's'} selected
      </p>
      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Search students by name or email…"
        style={{ marginBottom: '0.5rem', width: '100%' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: 320, overflowY: 'auto' }}>
        {paged.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--ap-text-muted)' }}>No students match.</p>}
        {paged.map((s) => (
          <label key={s._id} className={formStyles.checkboxLabel} style={{ fontWeight: 400, fontSize: '0.85rem' }}>
            <input type="checkbox" checked={selected.includes(s._id)} onChange={() => toggle(s._id)} />
            {s.name} <span style={{ color: 'var(--ap-text-muted)' }}>({s.email})</span>
          </label>
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      <Button size="sm" disabled={busy} onClick={handleSave} style={{ marginTop: '0.4rem' }}>
        {busy ? 'Saving…' : 'Save Membership'}
      </Button>
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
    setEditForm({ name: batch.name, description: batch.description || '' });
  };

  const handleRename = async (id) => {
    await studentBatchService.update(id, editForm);
    setEditingId(null);
    await refetch();
  };

  const handleDelete = async (batch) => {
    if (!window.confirm(`Delete batch "${batch.name}"? This does not delete the students, only the grouping.`)) return;
    await studentBatchService.remove(batch._id);
    await refetch();
  };

  return (
    <>
      <SEO title="Manage Batches" description="Form batches of registered students to target notes and worksheets." path="/dashboard/mentor/batches" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <h1>Manage Batches</h1>
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
                <p style={{ color: 'var(--ap-text-muted)' }}>No batches yet.</p>
              ) : (
                batches.map((batch) => (
                  <div key={batch._id} className={formStyles.card}>
                    <div className={formStyles.cardHeader}>
                      {editingId === batch._id ? (
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          style={{ flex: 1, marginRight: '0.5rem' }}
                        />
                      ) : (
                        <strong>{batch.name}</strong>
                      )}
                      <Badge tone="launching">
                        {(batch.studentIds || []).length} student{(batch.studentIds || []).length === 1 ? '' : 's'}
                      </Badge>
                    </div>
                    {editingId === batch._id ? (
                      <textarea
                        rows="2"
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        style={{ width: '100%', margin: '0.4rem 0' }}
                      />
                    ) : (
                      batch.description && <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)' }}>{batch.description}</p>
                    )}

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                      {editingId === batch._id ? (
                        <>
                          <Button size="sm" onClick={() => handleRename(batch._id)}>
                            Save
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
                          <Button size="sm" variant="danger" onClick={() => handleDelete(batch)}>
                            Delete
                          </Button>
                        </>
                      )}
                    </div>

                    {expandedId === batch._id && <MembershipPanel batch={batch} students={students} onSaved={refetch} />}
                  </div>
                ))
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
