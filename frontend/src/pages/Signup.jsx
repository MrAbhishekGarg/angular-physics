import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEO from '../components/seo/SEO.jsx';
import Container from '../components/common/Container.jsx';
import Button from '../components/common/Button.jsx';
import { useAuth } from '../hooks/useAuth.js';
import styles from './Auth.module.css';

const initialForm = { name: '', email: '', password: '', phone: '' };

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('idle'); // idle | submitting | error
  const [error, setError] = useState('');

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      await signup(form);
      navigate('/dashboard/student');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <>
      <SEO
        title="Create Account"
        description="Sign up for an Angular Physics student account to enroll in courses and track your progress."
        path="/signup"
      />
      <main>
        <Container>
          <div className={styles.wrap}>
            <h1>Create Account</h1>
            <p className={styles.intro}>Sign up as a student to enroll in courses and track your progress.</p>

            <form className={styles.form} onSubmit={handleSubmit}>
              <label>
                Name
                <input name="name" required value={form.name} onChange={handleChange} />
              </label>
              <label>
                Email
                <input type="email" name="email" required value={form.email} onChange={handleChange} />
              </label>
              <label>
                Phone (optional)
                <input name="phone" value={form.phone} onChange={handleChange} />
              </label>
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                />
              </label>

              <Button type="submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Creating account…' : 'Create Account'}
              </Button>

              {status === 'error' && <p className={styles.errorMsg}>{error}</p>}
            </form>

            <p className={styles.switch}>
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </Container>
      </main>
    </>
  );
}
