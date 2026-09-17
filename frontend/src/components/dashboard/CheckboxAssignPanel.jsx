import { useState } from 'react';
import Button from '../common/Button.jsx';
import formStyles from '../../pages/dashboard/DashboardForm.module.css';

export function idOf(x) {
  return typeof x === 'string' ? x : x._id;
}

/** Generic "pick some of these" checkbox panel — used to assign a note/worksheet to course(s) or batch(es). */
export default function CheckboxAssignPanel({ initialSelectedIds, options, labelKey, onSave }) {
  const [selected, setSelected] = useState(initialSelectedIds);
  const [busy, setBusy] = useState(false);

  const toggle = (id) => {
    setSelected((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await onSave(selected);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {(options || []).length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--ap-text-muted)' }}>Nothing to pick from yet.</p>}
        {(options || []).map((o) => (
          <label key={o._id} className={formStyles.checkboxLabel} style={{ fontWeight: 400, fontSize: '0.85rem' }}>
            <input type="checkbox" checked={selected.includes(o._id)} onChange={() => toggle(o._id)} />
            {o[labelKey]}
          </label>
        ))}
      </div>
      <Button size="sm" disabled={busy} onClick={handleSave} style={{ marginTop: '0.4rem' }}>
        {busy ? 'Saving…' : 'Save Assignment'}
      </Button>
    </div>
  );
}
