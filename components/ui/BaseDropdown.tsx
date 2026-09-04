'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDropdown } from '@/lib/DropdownContext';
import { useEscapeKey } from '@/lib/hooks/useEscapeKey';

interface BaseDropdownProps {
  trigger:   (open: boolean) => React.ReactNode;
  children:  React.ReactNode | ((close: () => void) => React.ReactNode);
  minWidth?: string;
  label?:    string; // aria-label for the menu — describe what it contains
  triggerClassName?: string; // extra class(es) merged onto the trigger button
}

/**
 * BaseDropdown — shared dropdown primitive.
 *
 * Improvements over the original (Kintsugi Blog) version:
 * - Portal-rendered to document.body — escapes the stacking-context trap
 *   that a position:sticky/fixed ancestor with its own z-index would
 *   otherwise cap it inside (see AS's SettingsPanel fix for the original
 *   bug this solves).
 * - Escape uses the shared stack (useEscapeKey) — with multiple dialogs/
 *   dropdowns open, one Escape press closes only the front-most, not all
 *   of them at once.
 * - Trigger is a real <button>, not a styled <div onClick>, so it's
 *   keyboard-reachable and Enter/Space-activatable by construction,
 *   rather than depending on every consumer happening to render a real
 *   button inside the trigger render-prop.
 * - Dynamically anchored via getBoundingClientRect() at open time (the
 *   original's position:absolute relative-to-parent approach doesn't
 *   work once portalled).
 * - Height-safe: capped to remaining viewport space below the trigger,
 *   with its own scroll, so it can never run off-screen.
 *
 * Usage — same API shape as the original:
 *   <BaseDropdown trigger={(open) => <span>Click me</span>}>
 *     {(close) => <ul><li onClick={close}>Item</li></ul>}
 *   </BaseDropdown>
 */
export default function BaseDropdown({ trigger, children, minWidth = '160px', label = 'Menu', triggerClassName = '' }: BaseDropdownProps) {
  const [open, setOpen]     = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef    = useRef<HTMLDivElement>(null);
  const { register, unregister } = useDropdown();

  function openMenu() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setAnchor({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  // Single registration path — open-dependent effect only. Avoid also
  // calling register()/unregister() manually elsewhere (e.g. in the click
  // handler) — that duplication is exactly what caused a stuck-backdrop
  // bug elsewhere in this codebase. One source of truth for this state.
  useEffect(() => {
    if (!open) return;
    register();
    return () => unregister();
  }, [open, register, unregister]);

  useEscapeKey(close, open);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current && !panelRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : openMenu())}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`base-dropdown__trigger${triggerClassName ? ' ' + triggerClassName : ''}`}
      >
        {trigger(open)}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          role="menu"
          aria-label={label}
          className="base-dropdown__panel"
          style={{
            top:       anchor.top,
            left:      anchor.left,
            minWidth,
            maxHeight: `calc(100vh - ${anchor.top + 16}px)`,
          }}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>,
        document.body
      )}
    </>
  );
}