import Logo from '../common/Logo.jsx';
import Container from '../common/Container.jsx';
import styles from './Footer.module.css';

const FOOTER_LINKS = [
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/refund-policy', label: 'Refund Policy' },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <Logo variant="light" />
        <p className={styles.tagline}>Find Your Angle to Every Answer · #PhysicsBoleTohAngularPhysics</p>
        <nav className={styles.links} aria-label="Footer">
          {FOOTER_LINKS.map((l) => (
            <a key={l.to} href={l.to}>
              {l.label}
            </a>
          ))}
        </nav>
        <p className={styles.copy}>&copy; {new Date().getFullYear()} Angular Physics. All rights reserved.</p>
      </Container>
    </footer>
  );
}
