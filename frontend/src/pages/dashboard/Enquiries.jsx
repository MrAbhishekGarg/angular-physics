import { useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Badge from '../../components/common/Badge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useLeads } from '../../hooks/useLeads.js';
import formStyles from './DashboardForm.module.css';

export default function Enquiries() {
  const { data: leads, loading, error, refetch } = useLeads();
  const [search, setSearch] = useState('');

  const filtered = (leads || []).filter((l) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      (l.courseSlug || '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      <SEO title="Enquiries" description="Every contact-form enquiry, with full contact details." path="/dashboard/mentor/enquiries" />
      <DashboardLayout role="mentor">
        <div className={formStyles.wrap} style={{ maxWidth: 900 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h1 style={{ marginBottom: 0 }}>Enquiries</h1>
            {leads && <Badge>{leads.length} enquir{leads.length === 1 ? 'y' : 'ies'}</Badge>}
          </div>
          <p style={{ color: 'var(--ap-text-muted)' }}>
            Every contact-form submission, newest first — full name, email, and phone number so you can follow up
            directly.
          </p>

          <div className={formStyles.form} style={{ marginBottom: 'var(--ap-space-md)' }}>
            <label style={{ maxWidth: 320 }}>
              Search
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone, or course" />
            </label>
          </div>

          {loading && <Spinner label="Loading enquiries…" />}
          {error && <ErrorState message={error} onRetry={refetch} />}

          {leads && leads.length === 0 && <p style={{ color: 'var(--ap-text-muted)' }}>No enquiries yet.</p>}
          {leads && leads.length > 0 && filtered.length === 0 && (
            <p style={{ color: 'var(--ap-text-muted)' }}>No enquiries match "{search}".</p>
          )}

          {filtered.map((l) => (
            <div key={l._id} className={formStyles.card}>
              <div className={formStyles.cardHeader}>
                <strong>{l.name}</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>
                  {new Date(l.createdAt).toLocaleString()}
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', margin: '0.3rem 0' }}>
                <a href={`tel:${l.phone}`} style={{ color: 'var(--ap-primary)', fontWeight: 700, textDecoration: 'none' }}>
                  {l.phone}
                </a>{' '}
                ·{' '}
                <a href={`mailto:${l.email}`} style={{ color: 'var(--ap-primary)', textDecoration: 'none' }}>
                  {l.email}
                </a>
              </p>
              {l.courseSlug && (
                <p style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>Interested in: {l.courseSlug}</p>
              )}
              {l.message && <p style={{ fontSize: '0.85rem' }}>{l.message}</p>}
              <span style={{ fontSize: '0.75rem', color: 'var(--ap-text-muted)' }}>Source: {l.source || 'website'}</span>
            </div>
          ))}
        </div>
      </DashboardLayout>
    </>
  );
}
