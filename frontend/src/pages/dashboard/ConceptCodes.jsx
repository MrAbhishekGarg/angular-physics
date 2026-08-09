import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useConceptCodes } from '../../hooks/useConceptCodes.js';
import { conceptCodeService } from '../../services/conceptCodeService.js';
import Badge from '../../components/common/Badge.jsx';
import formStyles from './DashboardForm.module.css';

const emptyForm = { code: '', label: '', chapter: '', topic: '' };

export default function ConceptCodes() {
  const { data: codes, loading, error, refetch } = useConceptCodes();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');

  const filtered = (codes || []).filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.code.toLowerCase().includes(q) ||
      c.label.toLowerCase().includes(q) ||
      (c.chapter || '').toLowerCase().includes(q) ||
      (c.topic || '').toLowerCase().includes(q)
    );
  });

  const [bulkFile, setBulkFile] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkWarnings, setBulkWarnings] = useState([]);

  const handleBulkUpload = async () => {
    if (!bulkFile) return;
    setBulkBusy(true);
    setBulkMessage('');
    setBulkWarnings([]);
    try {
      const { created, updated, warnings } = await conceptCodeService.bulkUpload(bulkFile);
      setBulkMessage(`${created} code${created === 1 ? '' : 's'} added, ${updated} updated.`);
      setBulkWarnings(warnings);
      setBulkFile(null);
      await refetch();
    } catch (err) {
      setBulkWarnings([err.message]);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const startEdit = (code) => {
    setEditingId(code._id);
    setForm({ code: code.code, label: code.label, chapter: code.chapter || '', topic: code.topic || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      if (editingId) await conceptCodeService.update(editingId, form);
      else await conceptCodeService.create(form);
      setForm(emptyForm);
      setEditingId(null);
      await refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (code) => {
    if (!window.confirm(`Delete concept code "${code.code}"?`)) return;
    await conceptCodeService.remove(code._id);
    await refetch();
  };

  return (
    <>
      <SEO title="Concept Codes" description="Maintain the taxonomy codes used to tag bulk-uploaded questions." path="/dashboard/mentor/concept-codes" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h1 style={{ marginBottom: 0 }}>Concept Codes</h1>
            {codes && <Badge>{codes.length} code{codes.length === 1 ? '' : 's'}</Badge>}
          </div>
            <p style={{ color: 'var(--ap-text-muted)' }}>
              Write <code>[CC:code]</code> next to a question in a bulk-upload docx to map just that question to a
              chapter/topic — overriding the batch defaults you pick on the upload form.
            </p>

            <div className={formStyles.form} style={{ marginBottom: 'var(--ap-space-md)' }}>
              <label style={{ maxWidth: 320 }}>
                Search
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code, label, chapter, or topic" />
              </label>
            </div>

            <div className={formStyles.card}>
              <strong>Bulk Upload Concept Codes</strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--ap-text-muted)', margin: '0.3rem 0' }}>
                Upload an Excel sheet with columns Code, Label, Chapter, Topic —{' '}
                <a
                  href="/templates/bulk-concept-codes-template.xlsx"
                  download
                  style={{ color: 'var(--ap-accent)', fontWeight: 700, textDecoration: 'underline' }}
                >
                  download the sample template
                </a>
                . Re-uploading a sheet updates existing codes instead of duplicating them — matched by Code.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setBulkFile(e.target.files[0])}
                  style={{ flex: 1, minWidth: 200 }}
                />
                <Button type="button" size="sm" disabled={!bulkFile || bulkBusy} onClick={handleBulkUpload}>
                  {bulkBusy ? 'Uploading…' : 'Upload & Add Codes'}
                </Button>
              </div>
              {bulkMessage && <p style={{ color: 'var(--ap-success)', fontSize: '0.85rem' }}>{bulkMessage}</p>}
              {bulkWarnings.length > 0 && (
                <ul style={{ color: 'var(--ap-warning)', fontSize: '0.8rem', paddingLeft: '1.2rem' }}>
                  {bulkWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>

            {loading && <Spinner label="Loading concept codes…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}

            {codes && (
              <div style={{ marginBottom: 'var(--ap-space-lg)' }}>
                {codes.length === 0 ? (
                  <p style={{ color: 'var(--ap-text-muted)' }}>No concept codes yet.</p>
                ) : filtered.length === 0 ? (
                  <p style={{ color: 'var(--ap-text-muted)' }}>No codes match "{search}".</p>
                ) : (
                  filtered.map((c) => (
                    <div key={c._id} className={formStyles.card}>
                      <div className={formStyles.cardHeader}>
                        <strong>{c.code}</strong>
                      </div>
                      <p style={{ fontSize: '0.85rem' }}>{c.label}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>
                        {c.chapter || '—'} {c.topic ? `· ${c.topic}` : ''}
                      </p>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(c)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <h2 style={{ color: 'var(--ap-primary)', marginBottom: 'var(--ap-space-sm)' }}>
              {editingId ? 'Edit Concept Code' : 'Add a Concept Code'}
            </h2>
            <form className={formStyles.form} onSubmit={handleSubmit}>
              <div className={formStyles.row}>
                <label>
                  Code
                  <input name="code" required value={form.code} onChange={handleChange} placeholder="PHY-ELEC-045" />
                </label>
                <label>
                  Label
                  <input name="label" required value={form.label} onChange={handleChange} placeholder="Current Electricity — Ohm's Law" />
                </label>
              </div>
              <div className={formStyles.row}>
                <label>
                  Chapter
                  <input name="chapter" value={form.chapter} onChange={handleChange} />
                </label>
                <label>
                  Topic
                  <input name="topic" value={form.topic} onChange={handleChange} />
                </label>
              </div>

              <div className={formStyles.actions}>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : editingId ? 'Save Changes' : 'Add Concept Code'}
                </Button>
                {editingId && (
                  <Button type="button" variant="ghost" onClick={cancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>

              {formError && <p className={formStyles.errorMsg}>{formError}</p>}
            </form>
        </div>
      </DashboardLayout>
    </>
  );
}
