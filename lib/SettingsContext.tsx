'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type LinkBehaviour = 'new-tab' | 'same-tab';

interface SettingsContextValue {
  externalLinks:      LinkBehaviour;
  internalLinks:      LinkBehaviour;
  focusAssistance:    boolean;
  setExternalLinks:   (v: LinkBehaviour) => void;
  setInternalLinks:   (v: LinkBehaviour) => void;
  setFocusAssistance: (v: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [externalLinks,   setExternalLinksState]   = useState<LinkBehaviour>('new-tab');
  const [internalLinks,   setInternalLinksState]   = useState<LinkBehaviour>('same-tab');
  const [focusAssistance, setFocusAssistanceState] = useState(true);

  useEffect(() => {
    const el = localStorage.getItem('as-external-links') as LinkBehaviour | null;
    const il = localStorage.getItem('as-internal-links') as LinkBehaviour | null;
    const fa = localStorage.getItem('as-focus-assistance');
    if (el === 'new-tab' || el === 'same-tab') setExternalLinksState(el);
    if (il === 'new-tab' || il === 'same-tab') setInternalLinksState(il);
    if (fa !== null) setFocusAssistanceState(fa === 'true');
  }, []);

  const setExternalLinks = (v: LinkBehaviour) => {
    setExternalLinksState(v);
    localStorage.setItem('as-external-links', v);
  };

  const setInternalLinks = (v: LinkBehaviour) => {
    setInternalLinksState(v);
    localStorage.setItem('as-internal-links', v);
  };

  const setFocusAssistance = (v: boolean) => {
    setFocusAssistanceState(v);
    localStorage.setItem('as-focus-assistance', String(v));
  };

  return (
    <SettingsContext.Provider value={{
      externalLinks, internalLinks, focusAssistance,
      setExternalLinks, setInternalLinks, setFocusAssistance,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}