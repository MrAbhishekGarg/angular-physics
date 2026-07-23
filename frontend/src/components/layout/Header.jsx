import { Link } from 'react-router-dom';
import Logo from '../common/Logo.jsx';
import Navbar from './Navbar.jsx';
import Button from '../common/Button.jsx';
import Container from '../common/Container.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import styles from './Header.module.css';

export default function Header() {
  const { user, loading, logout } = useAuth();
  const dashboardPath = user?.role === 'mentor' ? '/dashboard/mentor' : '/dashboard/student';

  return (
    <header className={styles.header}>
      <Container className={styles.inner}>
        <Logo />
        <Navbar />
        {loading ? null : user ? (
          <div className={styles.authArea}>
            <Button as={Link} to={dashboardPath} variant="ghost" size="sm">
              {user.name.split(' ')[0]}'s Dashboard
            </Button>
            <Button variant="secondary" size="sm" onClick={logout}>
              Log Out
            </Button>
          </div>
        ) : (
          <div className={styles.authArea}>
            <Button as={Link} to="/login" variant="ghost" size="sm">
              Login
            </Button>
            <Button as={Link} to="/signup" variant="secondary" size="sm">
              Sign Up
            </Button>
          </div>
        )}
      </Container>
    </header>
  );
}
