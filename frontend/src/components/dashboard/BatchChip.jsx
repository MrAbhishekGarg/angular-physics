import { batchColor } from '../../data/batchColors.js';

/**
 * A batch code shown as a colour-coded pill — the colour is stable per code
 * (see batchColors.js). Pass `order` (the sorted list of batch codes in
 * view) so several chips on one page get distinct hues. Text stays on a
 * translucent tint of the hue rather than the solid hue, so it reads on
 * both dashboard themes; the code itself is the primary label.
 */
export default function BatchChip({ code, order, size = 'md' }) {
  const c = batchColor(code, order);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        background: `${c}1f`,
        border: `1px solid ${c}66`,
        color: 'var(--ap-text)',
        fontWeight: 700,
        borderRadius: 999,
        padding: size === 'sm' ? '0.05rem 0.5rem' : '0.15rem 0.6rem',
        fontSize: size === 'sm' ? '0.72rem' : '0.8rem',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: c, flexShrink: 0 }} />
      {code}
    </span>
  );
}
