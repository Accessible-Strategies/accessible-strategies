'use client';

import { useDropdown } from '@/lib/DropdownContext';
import { useSettings } from '@/lib/SettingsContext';

export default function Backdrop() {
  const { openCount }       = useDropdown();
  const { focusAssistance } = useSettings();

  const active = openCount > 0 && focusAssistance;

  if (!active) return null;

  return <div className="page-backdrop" aria-hidden="true" />;
}