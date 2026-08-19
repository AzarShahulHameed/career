'use client';

import { useEffect, useState, useRef } from 'react';
import { SplashScreen } from './SplashScreen';

// Shows the animated brand splash on every real (hard) page load — i.e. the
// very first visit, and again right after login, since the login page does
// a full navigation into /admin specifically so this fires again (a
// client-side router.push wouldn't remount this component at all).
//
// Hides based on actual readiness (document/window "load", meaning the
// page's own resources have finished) rather than a fixed guessed
// duration — so on a slow connection it stays up until the app has
// genuinely caught up, instead of disappearing early and exposing a
// half-loaded page. A floor avoids a jarring flash on fast connections; a
// ceiling is a safety net in case "load" never fires for some reason.
const MIN_DISPLAY_MS = 650;
const MAX_DISPLAY_MS = 6000;

export function LaunchSplash() {
  const [visible, setVisible] = useState(false);
  const settledRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setVisible(true);
    settledRef.current = false;
    const shownAt = Date.now();

    function finish() {
      if (settledRef.current) return;
      settledRef.current = true;
      const elapsed = Date.now() - shownAt;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      window.setTimeout(() => setVisible(false), remaining);
    }

    if (document.readyState === 'complete') {
      finish();
    } else {
      window.addEventListener('load', finish, { once: true });
    }
    const maxTimer = window.setTimeout(finish, MAX_DISPLAY_MS);

    return () => {
      window.removeEventListener('load', finish);
      window.clearTimeout(maxTimer);
    };
  }, []);

  if (!visible) return null;
  return <SplashScreen />;
}
