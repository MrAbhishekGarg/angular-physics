import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { jobScheduleService } from '../../services/jobScheduleService.js';
import styles from './JobScheduleBatches.module.css';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function TopicPlan({ batchCode, plan, onChanged }) {
  const [items, setItems] = useState(plan);
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setItems(plan), [plan]);

  const covered = items.filter((i) => i.done).length;
  const pct = items.length ? (covered / items.length) * 100 : 0;

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
    <div>
      <p className={styles.sectionLabel}>Topic plan</p>
      {items.length > 0 && (
        <div className={styles.progressWrap}>
          <div className={styles.progress}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.progressText}>
            {covered}/{items.length} covered
          </span>
        </div>
      )}
      <ul className={styles.topics}>
        {items.map((item) => (
          <li key={item._id} className={styles.topic}>
            <input type="checkbox" checked={item.done} onChange={() => toggle(item)} />
            <span className={`${styles.topicTitle} ${item.done ? styles.topicDone : ''}`}>{item.title}</span>
            <button type="button" onClick={() => remove(item)} aria-label="Remove topic" className={styles.topicRemove}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className={styles.addTopic}>
        <input
          className={`${styles.input} ${styles.inputGrow}`}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a topic to cover…"
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
    <form onSubmit={submit} className={styles.newPlan}>
      <input className={`${styles.input} ${styles.inputCode}`} value={batchCode} onChange={(e) => setBatchCode(e.target.value)} placeholder="Batch code" />
      <input
        className={`${styles.input} ${styles.inputGrow}`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="First topic to cover for a batch you haven't taught yet…"
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
        <div className={styles.wrap}>
          <h1>My Job — Batch Progress</h1>
          <p className={styles.lede}>
            Per batch: what you’ve taught, and a topic plan for what’s left. Back to the{' '}
            <Link to="/dashboard/mentor/admin/job-schedule">schedule</Link> or the{' '}
            <Link to="/dashboard/mentor/admin/job">overview</Link>.
          </p>

          {!loading && !error && <NewBatchPlan onCreated={refetch} />}

          {loading && <Spinner />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && batches.length === 0 && (
            <p className={styles.empty}>No batches yet — classes and topic plans will group here.</p>
          )}

          {!loading &&
            !error &&
            batches.map((batch) => (
              <section key={batch.batchCode} className={styles.batch}>
                <div className={styles.batchHead}>
                  <span className={styles.batchCode}>{batch.batchCode}</span>
                  <span className={styles.batchStats}>
                    {batch.classCount} class{batch.classCount === 1 ? '' : 'es'} · {batch.hours} h
                    {batch.lastTaught ? ` · last taught ${formatDate(batch.lastTaught)}` : ''}
                  </span>
                </div>

                {batch.classes.length > 0 && (
                  <>
                    <p className={styles.sectionLabel}>Class log</p>
                    <div className={styles.log}>
                      {batch.classes.map((c) => (
                        <div key={c._id} className={styles.logItem}>
                          <strong>{formatDate(c.date)}</strong> · {c.startTime}
                          {c.endTime ? `–${c.endTime}` : ''} · Room {c.room || '?'}
                          {c.topicsCovered && <div className={styles.logMuted}>{c.topicsCovered}</div>}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <TopicPlan batchCode={batch.batchCode} plan={batch.plan || []} onChanged={refetch} />
              </section>
            ))}
        </div>
      </DashboardLayout>
    </>
  );
}
