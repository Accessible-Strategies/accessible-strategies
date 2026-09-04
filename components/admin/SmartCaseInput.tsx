'use client';

import { useState } from 'react';
import { toTitleCase } from '@/lib/utils/toTitleCase';

interface SmartCaseInputProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Auto-formats input to title case on every keystroke, preserving
 * acronyms and intentional mixed case (see toTitleCase.ts).
 *
 * Includes the per-field escape hatch (ported from Media Server's
 * AutocompleteField.tsx — a small Aa/aa toggle inside the input).
 * Off = type exactly what's entered, no transformation. On = auto-
 * capitalize. Quiet, discoverable, doesn't force the behavior.
 */
export default function SmartCaseInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: SmartCaseInputProps) {
  const [autoCase, setAutoCase] = useState(true);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(autoCase ? toTitleCase(e.target.value) : e.target.value);
  }

  return (
    <div className="form-input-wrapper">
      <input
        id={id}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="form-input form-input--with-toggle"
      />
      <button
        type="button"
        onClick={() => setAutoCase(v => !v)}
        aria-pressed={!autoCase}
        title={autoCase ? 'Auto-capitalizing — click to type exactly as entered' : 'Typing exactly as entered — click to resume auto-capitalize'}
        className={`smart-case-toggle${autoCase ? ' smart-case-toggle--active' : ''}`}
      >
        {autoCase ? 'Aa' : 'aa'}
      </button>
    </div>
  );
}