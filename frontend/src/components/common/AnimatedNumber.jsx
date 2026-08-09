import { useEffect, useRef, useState } from 'react';

/**
 * Counts up from 0 to the numeric part of `value` once it scrolls into
 * view, then holds — re-scrolling past it doesn't re-trigger. Handles a
 * leading non-digit prefix (e.g. "₹54,994" or "Q3") and a trailing suffix
 * (e.g. "4,800+", "82%"), animating just the digits in between. Falls back
 * to rendering the raw value as-is when it has no digits at all. Skips
 * straight to the final value for prefers-reduced-motion, since a
 * scroll-in flourish isn't worth overriding that preference for.
 */
export default function AnimatedNumber({ value, duration = 1400 }) {
  const str = String(value ?? '');
  const match = /^([^\d]*)(\d[\d,]*)(.*)$/.exec(str);
  const prefix = match ? match[1] : str;
  const target = match ? parseInt(match[2].replace(/,/g, ''), 10) : 0;
  const suffix = match ? match[3] : '';

  const [display, setDisplay] = useState(0);
  const spanRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!match) return undefined;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplay(target);
      return undefined;
    }

    const el = spanRef.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || startedRef.current) return;
        startedRef.current = true;

        const startTime = performance.now();
        const tick = (now) => {
          const progress = Math.min((now - startTime) / duration, 1);
          const eased = 1 - (1 - progress) ** 3; // ease-out cubic — fast start, gentle landing
          setDisplay(Math.round(target * eased));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, match]);

  return (
    <span ref={spanRef}>
      {prefix}
      {match ? display.toLocaleString('en-US') : null}
      {suffix}
    </span>
  );
}
