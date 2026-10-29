'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback, type KeyboardEvent, type ChangeEvent, type UIEvent } from 'react';
import { searchActorsAction } from '@/lib/actions/discovery';
import { useDropdown } from '@/lib/DropdownContext';
import { useEscapeKey } from '@/lib/hooks/useEscapeKey';

interface ActorMatch {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

interface MentionTextareaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}

// Computed-style properties that affect text layout/wrapping and therefore
// must be copied onto the mirror element so its line breaks match the
// textarea's exactly.
const MIRROR_STYLE_PROPS: (keyof CSSStyleDeclaration)[] = [
  'boxSizing',
  'width',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'letterSpacing',
  'lineHeight',
  'textTransform',
  'wordSpacing',
  'tabSize',
];

export default function MentionTextarea({
  id,
  value,
  onChange,
  rows = 5,
  placeholder,
  className,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const listboxId = `${id ?? 'mention'}-listbox`;

  // The @query currently being typed (null when the cursor isn't inside a mention trigger)
  const [query, setQuery] = useState<string | null>(null);
  // Character index where the "@" for the active query starts
  const [triggerIndex, setTriggerIndex] = useState<number | null>(null);

  const [matches, setMatches] = useState<ActorMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const { register, unregister } = useDropdown();
  const layerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (query === null || query.length === 0) {
      setMatches([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      searchActorsAction(query)
        .then(result => {
          setMatches(result.actors.slice(0, 6));
          setActiveIndex(0);
        })
        .catch(err => {
          console.error('Mention search failed:', err);
          setError(err instanceof Error ? err.message : 'Search failed');
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const showDropdown = query !== null && (loading || matches.length > 0 || !!error);

  const closeDropdown = useCallback(() => {
    setQuery(null);
    setTriggerIndex(null);
    setMatches([]);
    setError(null);
  }, []);

  // Announce to the shared dropdown context whenever the suggestion list is
  // showing, same as BaseDropdown does with `open` — this is what makes the
  // page-wide Focus Assistance backdrop appear behind this dropdown too.
  useEffect(() => {
    if (!showDropdown) return;
    layerIdRef.current = register('dropdown');
    return () => {
      if (layerIdRef.current) unregister(layerIdRef.current);
      layerIdRef.current = null;
    };
  }, [showDropdown, register, unregister]);

  // Escape closes only the front-most dialog/dropdown via the shared stack,
  // rather than this component deciding unilaterally.
  useEscapeKey(closeDropdown, showDropdown);

  // Position the dropdown at the caret (where the "@" trigger sits) rather
  // than at the bottom of the whole textarea box, using a hidden mirror
  // element to measure exactly where that character lands.
  useLayoutEffect(() => {
    if (!showDropdown || triggerIndex === null) return;
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror) return;

    const style = window.getComputedStyle(ta);
    MIRROR_STYLE_PROPS.forEach(prop => {
      (mirror.style as any)[prop] = style[prop];
    });

    const textBeforeTrigger = value.slice(0, triggerIndex);
    const textAfterTrigger = value.slice(triggerIndex) || '​';

    mirror.textContent = '';
    mirror.appendChild(document.createTextNode(textBeforeTrigger));
    const marker = document.createElement('span');
    marker.textContent = '​';
    mirror.appendChild(marker);
    mirror.appendChild(document.createTextNode(textAfterTrigger));

    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;

    setDropdownPos({
      top: marker.offsetTop + lineHeight - ta.scrollTop,
      left: marker.offsetLeft - ta.scrollLeft,
    });
  }, [showDropdown, triggerIndex, value]);

  function detectMentionTrigger(text: string, cursor: number) {
    // Walk backwards from the cursor to find an "@" that starts a mention,
    // stopping if we hit whitespace or the start of the string.
    let i = cursor - 1;
    while (i >= 0) {
      const ch = text[i];
      if (ch === '@') {
        const candidate = text.slice(i + 1, cursor);
        // Bail out if there's a space in the candidate (mention already ended)
        if (/\s/.test(candidate)) return null;
        return { start: i, query: candidate };
      }
      if (/\s/.test(ch)) return null;
      i--;
    }
    return null;
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    const cursor = e.target.selectionStart ?? text.length;
    onChange(text);

    const trigger = detectMentionTrigger(text, cursor);
    if (trigger) {
      setTriggerIndex(trigger.start);
      setQuery(trigger.query);
    } else {
      setTriggerIndex(null);
      setQuery(null);
    }
  }

  function handleScroll(e: UIEvent<HTMLTextAreaElement>) {
    // Keep the dropdown anchored to the "@" as the textarea scrolls.
    if (triggerIndex === null) return;
    const ta = e.currentTarget;
    const mirror = mirrorRef.current;
    if (!mirror) return;
    const marker = mirror.querySelector('span');
    if (!marker) return;
    const style = window.getComputedStyle(ta);
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    setDropdownPos({
      top: (marker as HTMLElement).offsetTop + lineHeight - ta.scrollTop,
      left: (marker as HTMLElement).offsetLeft - ta.scrollLeft,
    });
  }

  function insertMention(actor: ActorMatch) {
    if (triggerIndex === null) return;
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, triggerIndex);
    const after = value.slice(cursor);
    const insertedText = `@${actor.handle} `;
    const newValue = `${before}${insertedText}${after}`;
    onChange(newValue);
    closeDropdown();

    // Restore focus and move the caret to just after the inserted mention
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        const newCursor = before.length + insertedText.length;
        el.focus();
        el.setSelectionRange(newCursor, newCursor);
      }
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!showDropdown || matches.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(matches[activeIndex]);
    } else if (e.key === 'Escape') {
      // Prevent the browser's default Escape behavior (e.g. clearing
      // selection); the actual close is handled by useEscapeKey above via
      // the shared stack, so it only fires when this is the front-most
      // open dialog/dropdown.
      e.preventDefault();
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        rows={rows}
        placeholder={placeholder}
        className={className}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-activedescendant={
          showDropdown && matches[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined
        }
        aria-autocomplete="list"
      />

      {/* Hidden mirror used only to measure where the "@" trigger renders
          inside the textarea, so the dropdown can anchor to it. Never shown. */}
      <div
        ref={mirrorRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          visibility: 'hidden',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          overflow: 'hidden',
          height: 0,
          pointerEvents: 'none',
        }}
      />

      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 50,
            top: dropdownPos.top,
            left: dropdownPos.left,
            marginTop: 2,
            width: 'max-content',
            minWidth: 160,
            maxWidth: 280,
            maxHeight: 220,
            overflowY: 'auto',
            background: 'var(--as-bg-main)',
            border: '1px solid var(--as-border)',
            borderRadius: 'var(--as-radius-md)',
            boxShadow: 'var(--as-shadow-lg)',
            padding: 4,
            listStyle: 'none',
          }}
        >
          {loading && (
            <li style={{ padding: '8px 12px', color: 'var(--as-text)' }}>Searching…</li>
          )}

          {error && (
            <li role="alert" style={{ padding: '8px 12px', color: 'var(--as-error)' }}>
              {error}
            </li>
          )}

          {!loading &&
            !error &&
            matches.map((actor, i) => (
              <li
                key={actor.did}
                id={`${listboxId}-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={e => {
                  // Prevent the textarea from losing focus before we handle the click
                  e.preventDefault();
                  insertMention(actor);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 'var(--as-radius-sm)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: i === activeIndex ? 'var(--as-border)' : 'transparent',
                }}
              >
                {actor.avatar && (
                  <img
                    src={actor.avatar}
                    alt=""
                    style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, overflow: 'hidden' }}>
                  <span
                    style={{
                      fontSize: 'var(--as-text-sm)',
                      fontWeight: 700,
                      color: 'var(--as-text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {actor.displayName || actor.handle}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--as-text-xs)',
                      fontWeight: 400,
                      color: 'var(--as-text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    @{actor.handle}
                  </span>
                </div>
              </li>
            ))}

          {!loading && !error && matches.length === 0 && (
            <li style={{ padding: '8px 12px', color: 'var(--as-text)' }}>No matches</li>
          )}
        </ul>
      )}
    </div>
  );
}