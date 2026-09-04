'use client';

import { useState, useEffect } from 'react';
import { ThemeProvider }    from '@/lib/ThemeContext';
import { SettingsProvider } from '@/lib/SettingsContext';
import { DropdownProvider } from '@/lib/DropdownContext';

/**
 * Wraps all client-side providers and forces a full in-memory
 * remount of the tree when the page is restored from the browser's
 * back/forward cache (bfcache) — e.g. after clicking an external
 * link and hitting Back.
 *
 * Without this, client-only state tied to DOM refs (like the
 * settings panel's React portal, or the gear button's measured
 * position) can end up stale or unresponsive after a bfcache
 * restore, since the browser resumes frozen JS state rather than
 * re-running mount effects.
 *
 * Remounting via a changing `key` is synchronous and happens
 * before the next paint — unlike a full page reload, there's no
 * visible flash and no window where stale state is still clickable.
 */
export default function AppProviders({ children }: { children: React.ReactNode }) {
  const [remountKey, setRemountKey] = useState(0);

  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      console.log('pageshow fired, persisted:', e.persisted);
      if (e.persisted) {
        console.log('bfcache restore detected — remounting');
        // Defer so Next.js's own router re-initialization after the
        // bfcache restore finishes first — remounting immediately
        // races with it and throws "Router action dispatched before
        // initialization."
        setTimeout(() => setRemountKey(k => k + 1), 0);
      }
    }
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return (
    <ThemeProvider key={remountKey}>
      <SettingsProvider>
        <DropdownProvider>
          {children}
        </DropdownProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}