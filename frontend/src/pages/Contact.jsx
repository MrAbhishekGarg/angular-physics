import { useState } from 'react';
import SEO from '../components/seo/SEO.jsx';
import Container from '../components/common/Container.jsx';
import Button from '../components/common/Button.jsx';
import { leadService } from '../services/leadService.js';
import styles from './Contact.module.css';

const initialForm = { name: '', email: '', phone: '', message: '' };

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      await leadService.create({ ...form, source: 'contact-page' });
      setStatus('success');
      setForm(initialForm);
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      <SEO
        title="Contact Us"
        description="Get in touch with Angular Physics for course queries, enrollment help, or partnership enquiries."
        path="/contact"
      />
      <main>
        <Container>
          <div className={styles.wrap}>
            <h1>Contact Us</h1>
            <p className={styles.intro}>
              Have a question about a course or your enrollment? Send us a message and the
              Angular Physics team will get back to you.
            </p>

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
                Message
                <textarea name="message" rows="4" value={form.message} onChange={handleChange} />
              </label>

              <Button type="submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Sending…' : 'Send Message'}
              </Button>

              {status === 'success' && <p className={styles.success}>Thanks — we'll be in touch soon.</p>}
              {status === 'error' && <p className={styles.errorMsg}>Something went wrong. Please try again.</p>}
            </form>
          </div>
        </Container>
      </main>
    </>
  );
}
