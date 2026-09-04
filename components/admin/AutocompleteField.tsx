'use client';

import { useEffect, useRef, useState } from 'react';
import { toTitleCase } from '@/lib/utils/toTitleCase';

interface AutocompleteFieldProps {
  label:      string;
  value:      string;
  onChange:   (v: string) => void;
  options:    string[];          // existing values to suggest
  numeric?:   boolean;           // restrict input to digits
  titleCase?: boolean;           // auto-format to Title Case as user types
  minLength?: number;            // e.g. 4 for year
  maxLength?: number;
  validate?:  (v: string) => string | null; // returns error message or null
}

export default function AutocompleteField({
  label,
  value,
  onChange,
  options,
  numeric   = false,
  titleCase = false,
  minLength,
  maxLength,
  validate,
}: AutocompleteFieldProps) {
  const [showList, setShowList] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [autoCase, setAutoCase] = useState(true); // per-field escape hatch — off = type exactly as entered
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = options
    .filter(opt => opt.toLowerCase().includes(value.toLowerCase()) && opt !== value)
    .slice(0, 8);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowList(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInputChange(raw: string) {
    let next = raw;

    if (numeric) {
      next = next.replace(/[^\d]/g, '');
      if (maxLength) next = next.slice(0, maxLength);
    } else if (titleCase && autoCase) {
      next = toTitleCase(next);
    }
    // autoCase off, or titleCase not enabled — no transformation, exactly as typed

    onChange(next);
    setShowList(true);

    if (validate) {
      setError(next ? validate(next) : null);
    } else if (numeric && minLength && next.length > 0 && next.length < minLength) {
      setError(`Must be ${minLength} digits`);
    } else {
      setError(null);
    }
  }

  function selectOption(opt: string) {
    onChange(opt);
    setShowList(false);
    setError(null);
  }

  return (
    <div ref={wrapperRef} className="form-row" style={{ position: 'relative' }}>
      <label className="form-label">{label}</label>

      <div className="form-input-wrapper">
        <input
          type="text"
          inputMode={numeric ? 'numeric' : 'text'}
          value={value}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => setShowList(true)}
          className={`form-input${error ? ' form-input--invalid' : ''}${titleCase && !numeric ? ' form-input--with-toggle' : ''}`}
        />

        {/* Escape hatch — quiet, inline, only shown for title-case fields.
            Toggling off means "type exactly what I enter" for this field. */}
        {titleCase && !numeric && (
          <button
            type="button"
            onClick={() => setAutoCase(v => !v)}
            aria-pressed={!autoCase}
            title={autoCase ? 'Auto-capitalizing — click to type exactly as entered' : 'Typing exactly as entered — click to resume auto-capitalize'}
            className={`smart-case-toggle${autoCase ? ' smart-case-toggle--active' : ''}`}
          >
            {autoCase ? 'Aa' : 'aa'}
          </button>
        )}
      </div>

      {error && (
        <span role="alert" style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-error)' }}>
          {error}
        </span>
      )}

      {showList && filtered.length > 0 && (
        <ul role="listbox" aria-label={`${label} suggestions`} className="autocomplete-list">
          {filtered.map(opt => (
            <li key={opt}>
              <button type="button" onClick={() => selectOption(opt)}>
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}