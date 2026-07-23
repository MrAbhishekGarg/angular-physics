import { Link } from 'react-router-dom';
import logo from '../../assets/logo.svg';
import styles from './Logo.module.css';

export default function Logo({ variant = 'dark' }) {
  return (
    <Link to="/" className={styles.logoLink} aria-label="Angular Physics home">
      <img src={logo} alt="" width="36" height="36" />
      <span className={`${styles.wordmark} ${styles[variant]}`}>
        Angular<span className={styles.accent}>Physics</span>
      </span>
    </Link>
  );
}
