import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Browser-based test integrity checks — NOT camera/recording proctoring.
 * Requests fullscreen, and counts tab-switches/blurs/fullscreen-exits plus
 * blocks right-click/copy/paste. Crosses THRESHOLDS -> onExceeded() fires
 * once so the caller can auto-submit. Mirrors the flagging thresholds used
 * server-side in test.service.js's submitAttempt.
 */
const THRESHOLDS = { tabSwitchCount: 3, blurCount: 5, fullscreenExitCount: 2 };

export function useProctoring({ enabled, onExceeded }) {
  const [counts, setCounts] = useState({ tabSwitchCount: 0, blurCount: 0, fullscreenExitCount: 0 });
  const countsRef = useRef(counts);
  const exceededRef = useRef(false);

  // Keeps `bump` referentially stable across renders (assigned during render,
  // no effect needed) — critical because TestAttempt re-renders every second
  // from its countdown timer. If `bump` changed identity every render, the
  // fullscreen-tracking effect below (which depends on it) would tear down
  // and re-run every second, calling exitFullscreen()+requestFullscreen()
  // in a loop and firing spurious fullscreenchange events that falsely
  // incremented fullscreenExitCount — auto-submitting the test within
  // seconds of it starting, regardless of anything the student actually did.
  const onExceededRef = useRef(onExceeded);
  onExceededRef.current = onExceeded;

  const bump = useCallback((key) => {
    setCounts((c) => {
      const next = { ...c, [key]: c[key] + 1 };
      countsRef.current = next;
      if (!exceededRef.current && next[key] > THRESHOLDS[key]) {
        exceededRef.current = true;
        onExceededRef.current?.(next);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) bump('fullscreenExitCount');
    };
    const onVisibility = () => {
      if (document.hidden) bump('tabSwitchCount');
    };
    const onBlur = () => bump('blurCount');
    const preventDefault = (e) => e.preventDefault();

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('paste', preventDefault);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('copy', preventDefault);
      document.removeEventListener('paste', preventDefault);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [enabled, bump]);

  return { counts, countsRef };
}
