import styles from './Spinner.module.css';

export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.circle} />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
