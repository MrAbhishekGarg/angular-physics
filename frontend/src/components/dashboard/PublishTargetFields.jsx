import formStyles from '../../pages/dashboard/DashboardForm.module.css';

/**
 * Two optional multi-select checkbox groups (courses, batches) for the
 * create form of a Note/Worksheet — publishing to neither keeps the
 * original "visible to everyone" default; picking either narrows
 * visibility to students eligible via at least one selected course OR
 * batch. Mirrors the post-creation Assign panels, just inline at publish
 * time so a mentor can target in one step instead of create-then-assign.
 */
export default function PublishTargetFields({ courses, batches, selectedCourseIds, selectedBatchIds, onCourseIdsChange, onBatchIdsChange }) {
  const toggle = (ids, id, onChange) => {
    onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };

  return (
    <>
      <div className={formStyles.row}>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>
            Publish to course(s) <span style={{ fontWeight: 400, color: 'var(--ap-text-muted)' }}>(optional — leave blank for everyone)</span>
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
              maxHeight: 140,
              overflowY: 'auto',
              border: '1px solid var(--ap-border)',
              borderRadius: 'var(--ap-radius)',
              padding: '0.4rem 0.6rem',
            }}
          >
            {(courses || []).length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>No courses yet.</span>}
            {(courses || []).map((c) => (
              <label key={c._id} className={formStyles.checkboxLabel} style={{ fontWeight: 400, fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={selectedCourseIds.includes(c._id)}
                  onChange={() => toggle(selectedCourseIds, c._id, onCourseIdsChange)}
                />
                {c.title}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>
            Publish to batch(es) <span style={{ fontWeight: 400, color: 'var(--ap-text-muted)' }}>(optional — leave blank for everyone)</span>
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
              maxHeight: 140,
              overflowY: 'auto',
              border: '1px solid var(--ap-border)',
              borderRadius: 'var(--ap-radius)',
              padding: '0.4rem 0.6rem',
            }}
          >
            {(batches || []).length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>No batches yet.</span>}
            {(batches || []).map((b) => (
              <label key={b._id} className={formStyles.checkboxLabel} style={{ fontWeight: 400, fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={selectedBatchIds.includes(b._id)}
                  onChange={() => toggle(selectedBatchIds, b._id, onBatchIdsChange)}
                />
                {b.name}
              </label>
            ))}
          </div>
        </div>
      </div>
      {(selectedCourseIds.length > 0 || selectedBatchIds.length > 0) && (
        <p style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)', marginTop: '-0.5rem' }}>
          Only students eligible via at least one picked course OR batch will see this.
        </p>
      )}
    </>
  );
}
