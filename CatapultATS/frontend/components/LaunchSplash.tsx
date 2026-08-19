'use client';

import { useEffect, useState } from 'react';
import { SplashScreen } from './SplashScreen';

// Shows the animated brand splash once per browser session, on first load
// of the app — a proper "launch screen" moment, separate from the
// route-level loading.tsx fallback that covers slow in-app navigation.
export function LaunchSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('cc-launched')) return;

    setVisible(true);
    sessionStorage.setItem('cc-launched', '1');
    const timer = setTimeout(() => setVisible(false), 1100);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return <SplashScreen />;
}
