import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from '../common/Logo.jsx';
import Navbar from './Navbar.jsx';
import Button from '../common/Button.jsx';
import Container from '../common/Container.jsx';
import { useAuth, isMentorRole } from '../../hooks/useAuth.js';
import { useTheme } from '../../hooks/useTheme.js';
import styles from './Header.module.css';

export default function Header() {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const dashboardPath = isMentorRole(user?.role) ? '/dashboard/mentor' : '/dashboard/student';

  // Close the mobile menu automatically on route change (e.g. after tapping a link).
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <header className={styles.header}>
      <Container className={styles.inner}>
        <Logo variant={theme === 'dark' ? 'light' : 'dark'} />

        <button
          type="button"
          className={styles.menuToggle}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className={styles.menuIcon} data-open={menuOpen} />
        </button>

        <div className={`${styles.collapsible} ${menuOpen ? styles.collapsibleOpen : ''}`}>
          <Navbar />
          {loading ? null : user ? (
            <div className={styles.authArea}>
              <button
                type="button"
                className={styles.themeToggle}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <Button as={Link} to={dashboardPath} variant="ghost" size="sm" onClick={() => setMenuOpen(false)}>
                {user.name.split(' ')[0]}'s Dashboard
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
              >
                Log Out
              </Button>
            </div>
          ) : (
            <div className={styles.authArea}>
              <button
                type="button"
                className={styles.themeToggle}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <Button as={Link} to="/login" variant="ghost" size="sm" onClick={() => setMenuOpen(false)}>
                Login
              </Button>
              <Button as={Link} to="/signup" variant="secondary" size="sm" onClick={() => setMenuOpen(false)}>
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </Container>
    </header>
  );
}
