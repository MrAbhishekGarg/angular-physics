import styles from './AchievementsPanel.module.css';

// Every metric label is "<plural noun> <verb>" ("Classes taught", "Batches
// taught") — only the leading noun needs singularizing when exactly one is
// left (testing the whole phrase's ending matched "taught", not "batches",
// and left it unchanged — this operates on just the first word instead).
function singularize(phrase) {
  const [first, ...rest] = phrase.split(' ');
  let singular = first;
  if (/(ch|sh|ss|x)es$/i.test(first)) singular = first.slice(0, -2);
  else if (/s$/i.test(first)) singular = first.slice(0, -1);
  return [singular, ...rest].join(' ');
}

/**
 * One metric's state against its milestone ladder — which rungs are
 * cleared, which is next, and whether the current value is still close
 * enough to the last-cleared rung to call it "just hit" (there's no
 * historical snapshot to compare against, so this is a judgment call: within
 * 5% of the milestone, or within 3 absolute, reads as "recent" rather than
 * "ages ago").
 */
function metricState(value, milestones) {
  const sorted = [...milestones].sort((a, b) => a - b);
  const achieved = sorted.filter((m) => value >= m);
  const highest = achieved.length ? achieved[achieved.length - 1] : null;
  const next = sorted.find((m) => value < m) ?? null;
  const justCrossed = highest != null && value - highest <= Math.max(3, Math.round(highest * 0.05));
  return { highest, next, justCrossed, remaining: next != null ? next - value : null };
}

/**
 * A celebratory summary rather than another stats table — the raw numbers
 * already live in the tiles/charts below this on both My Job and Content
 * Planner; this exists purely to surface "what's worth feeling good about
 * right now" (a milestone just cleared, or how close the next one is) so
 * that doesn't get lost in a wall of counts.
 */
export default function AchievementsPanel({ metrics }) {
  const states = metrics.map((m) => ({ ...m, state: metricState(m.value, m.milestones) }));

  // Headline: a just-crossed milestone is always the most exciting thing to
  // lead with; otherwise lead with whichever metric is closest (in relative
  // terms) to its next one, since "so close" is the most motivating framing
  // when nothing's been freshly hit.
  const justCrossed = states.find((m) => m.state.justCrossed);
  const closest = [...states]
    .filter((m) => m.state.next != null)
    .sort((a, b) => a.state.remaining / a.state.next - b.state.remaining / b.state.next)[0];

  let headline = null;
  if (justCrossed) {
    headline = `🎉 New milestone — ${justCrossed.state.highest.toLocaleString()} ${justCrossed.label.toLowerCase()}!`;
  } else if (closest) {
    const noun = closest.state.remaining === 1 ? singularize(closest.label.toLowerCase()) : closest.label.toLowerCase();
    headline = `🔥 Just ${closest.state.remaining.toLocaleString()} more ${noun} to hit ${closest.state.next.toLocaleString()}`;
  }

  const anyAchieved = states.some((m) => m.state.highest != null);

  return (
    <div className={styles.panel}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.inner}>
        {headline ? (
          <p className={styles.headline}>{headline}</p>
        ) : (
          <p className={styles.headline}>🚀 Every number below starts your first streak — get going!</p>
        )}

        {anyAchieved && (
          <div className={styles.trophyRow}>
            {states
              .filter((m) => m.state.highest != null)
              .map((m) => (
                <div key={m.key} className={`${styles.trophy} ${m.state.justCrossed ? styles.trophyNew : ''}`}>
                  <span className={styles.trophyIcon}>{m.icon}</span>
                  <span className={styles.trophyText}>
                    <strong>{m.state.highest.toLocaleString()}+</strong> {m.label.toLowerCase()} milestone
                  </span>
                  {m.state.justCrossed && <span className={styles.trophyBadge}>NEW</span>}
                </div>
              ))}
          </div>
        )}

        <div className={styles.progressRow}>
          {states
            .filter((m) => m.state.next != null)
            .map((m) => {
              const base = m.state.highest ?? 0;
              const span = m.state.next - base;
              const pct = span > 0 ? Math.min(100, Math.round(((m.value - base) / span) * 100)) : 100;
              return (
                <div key={m.key} className={styles.progressItem}>
                  <div className={styles.progressLabel}>
                    <span>
                      {m.icon} {m.label}
                    </span>
                    <span className={styles.progressNums}>
                      {m.value.toLocaleString()} / {m.state.next.toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
