'use client';

import { AppLogo } from './AppLogo';

// Full-screen animated brand loader. Used both as the initial "launch
// screen" and as the fallback whenever a route/segment is slow to load
// (via Next.js loading.tsx conventions) — same idea as the Zoho suite's
// pulsing-logo loader instead of a blank white screen.
export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-white">
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative">
          <span className="absolute inset-0 -m-4 rounded-full bg-accent/10 animate-ping-slow" />
          <AppLogo size={40} className="relative animate-logo-pulse" />
        </div>
        <div className="flex gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-dot-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-dot-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-dot-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
