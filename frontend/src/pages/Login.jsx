import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEO from '../components/seo/SEO.jsx';
import Container from '../components/common/Container.jsx';
import Button from '../components/common/Button.jsx';
import { useAuth, isMentorRole } from '../hooks/useAuth.js';
import styles from './Auth.module.css';

const initialForm = { email: '', password: '' };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('idle'); // idle | submitting | error
  const [error, setError] = useState('');

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const user = await login(form);
      navigate(isMentorRole(user.role) ? '/dashboard/mentor' : '/dashboard/student');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <>
      <SEO title="Log In" description="Log in to your Angular Physics student or mentor dashboard." path="/login" />
      <main>
        <Container>
          <div className={styles.wrap}>
            <h1>Log In</h1>
            <p className={styles.intro}>Access your dashboard as a student or mentor.</p>

            <form className={styles.form} onSubmit={handleSubmit}>
              <label>
                Email
                <input type="email" name="email" required value={form.email} onChange={handleChange} />
              </label>
              <label>
                Password
                <input type="password" name="password" required value={form.password} onChange={handleChange} />
              </label>

              <Button type="submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Logging in…' : 'Log In'}
              </Button>

              {status === 'error' && <p className={styles.errorMsg}>{error}</p>}
            </form>

            <p className={styles.switch}>
              New here? <Link to="/signup">Create a student account</Link>
            </p>
          </div>
        </Container>
      </main>
    </>
  );
}
