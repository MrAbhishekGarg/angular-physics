import AnimatedNumber from './AnimatedNumber.jsx';
import styles from './Stat.module.css';

export default function Stat({ value, label }) {
  return (
    <div className={styles.stat}>
      <div className={styles.value}>
        <AnimatedNumber value={value} />
      </div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
