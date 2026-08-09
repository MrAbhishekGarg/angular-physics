import { Link } from 'react-router-dom';
import wordmarkBlack from '../../assets/logo-wordmark-black.svg';
import wordmarkWhite from '../../assets/logo-wordmark-white.svg';
import styles from './Logo.module.css';

/**
 * variant='dark' renders the black wordmark (for light backgrounds, e.g.
 * the header); variant='light' renders the white wordmark (for dark
 * backgrounds, e.g. the footer).
 */
export default function Logo({ variant = 'dark' }) {
  const src = variant === 'light' ? wordmarkWhite : wordmarkBlack;
  return (
    <Link to="/" className={styles.logoLink} aria-label="Angular Physics home">
      {/* Small decorative accent, not part of the actual brand mark file —
          echoes the "angular" shape language next to the real wordmark. */}
      <span className={`${styles.mark} ${variant === 'light' ? styles.markOnDark : ''}`} aria-hidden="true">
        &#8736;
      </span>
      <img src={src} alt="Angular Physics" className={styles.logoImg} />
    </Link>
  );
}
