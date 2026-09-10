import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { jobScheduleService } from '../../services/jobScheduleService.js';
import formStyles from './DashboardForm.module.css';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function TopicPlan({ batchCode, plan, onChanged }) {
  const [items, setItems] = useState(plan);
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setItems(plan), [plan]);

  const covered = items.filter((i) => i.done).length;

  const add = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      const created = await jobScheduleService.createTopicPlan(batchCode, newTitle.trim());
      setItems((prev) => [...prev, created]);
      setNewTitle('');
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item) => {
    const next = !item.done;
    setItems((prev) => prev.map((i) => (i._id === item._id ? { ...i, done: next } : i)));
    await jobScheduleService.updateTopicPlan(item._id, { done: next });
    onChanged?.();
  };

  const remove = async (item) => {
    setItems((prev) => prev.filter((i) => i._id !== item._id));
    await jobScheduleService.removeTopicPlan(item._id);
    onChanged?.();
  };

  return (
    <div style={{ marginTop: '0.6rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ap-text-muted)', marginBottom: '0.3rem' }}>
        Topic plan — {covered}/{items.length} covered
      </div>
      {items.length > 0 && (
        <div
          style={{ height: 6, background: 'var(--ap-bg-muted)', borderRadius: 3, overflow: 'hidden', marginBottom: '0.5rem' }}
        >
          <div style={{ height: '100%', width: `${(covered / items.length) * 100}%`, background: 'var(--ap-success)' }} />
        </div>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {items.map((item) => (
          <li key={item._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={item.done} onChange={() => toggle(item)} />
            <span style={{ flex: 1, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--ap-text-muted)' : 'var(--ap-text)' }}>
              {item.title}
            </span>
            <button
              type="button"
              onClick={() => remove(item)}
              aria-label="Remove topic"
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ap-danger)', fontWeight: 700 }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a topic to cover…"
          style={{ flex: 1, border: '1.5px solid var(--ap-border)', borderRadius: 8, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
        />
        <Button type="submit" size="sm" variant="ghost" disabled={busy || !newTitle.trim()}>
          Add
        </Button>
      </form>
    </div>
  );
}

function NewBatchPlan({ onCreated }) {
  const [batchCode, setBatchCode] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!batchCode.trim() || !title.trim()) return;
    setBusy(true);
    try {
      await jobScheduleService.createTopicPlan(batchCode.trim(), title.trim());
      setBatchCode('');
      setTitle('');
      onCreated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={formStyles.card} style={{ marginBottom: '0.6rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        value={batchCode}
        onChange={(e) => setBatchCode(e.target.value)}
        placeholder="Batch code"
        style={{ border: '1.5px solid var(--ap-border)', borderRadius: 8, padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: 120 }}
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="First topic to cover…"
        style={{ flex: 1, minWidth: 180, border: '1.5px solid var(--ap-border)', borderRadius: 8, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
      />
      <Button type="submit" size="sm" variant="ghost" disabled={busy || !batchCode.trim() || !title.trim()}>
        Start a plan
      </Button>
    </form>
  );
}

export default function JobScheduleBatches() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = async () => {
    setLoading(true);
    setError('');
    try {
      setBatches(await jobScheduleService.getBatches());
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
      <SEO title="My Job — Batch Progress" description="Per-batch teaching log and topic plan for Aakash classes." path="/dashboard/mentor/admin/job-schedule/batches" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <h1>My Job — Batch Progress</h1>
          <p style={{ color: 'var(--ap-text-muted)' }}>
            Per batch: what you've taught, and a topic plan for what's left — back to{' '}
            <Link to="/dashboard/mentor/admin/job-schedule">the schedule</Link> or the{' '}
            <Link to="/dashboard/mentor/admin/job">overview</Link>.
          </p>

          {!loading && !error && <NewBatchPlan onCreated={refetch} />}

          {loading && <Spinner />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && batches.length === 0 && (
            <p style={{ color: 'var(--ap-text-muted)' }}>No batches yet — classes and topic plans will group here.</p>
          )}
          {!loading &&
            !error &&
            batches.map((batch) => (
              <div key={batch.batchCode} className={formStyles.card} style={{ marginBottom: '0.6rem' }}>
                <div className={formStyles.cardHeader}>
                  <strong>{batch.batchCode}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>
                    {batch.classCount} class{batch.classCount === 1 ? '' : 'es'} · {batch.hours} h
                    {batch.lastTaught ? ` · last taught ${formatDate(batch.lastTaught)}` : ''}
                  </span>
                </div>

                {batch.classes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {batch.classes.map((c) => (
                      <div key={c._id} style={{ borderLeft: '3px solid var(--ap-border)', paddingLeft: '0.6rem', fontSize: '0.85rem' }}>
                        <strong>{formatDate(c.date)}</strong> · {c.startTime}
                        {c.endTime ? `–${c.endTime}` : ''} · Room {c.room || '?'}
                        {c.topicsCovered && <div style={{ color: 'var(--ap-text-muted)' }}>{c.topicsCovered}</div>}
                      </div>
                    ))}
                  </div>
                )}

                <TopicPlan batchCode={batch.batchCode} plan={batch.plan || []} onChanged={refetch} />
              </div>
            ))}
        </div>
      </DashboardLayout>
    </>
  );
}
