'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDropdown } from '@/lib/DropdownContext';
import { useEscapeKey } from '@/lib/hooks/useEscapeKey';
import { useSettings } from '@/lib/SettingsContext';

interface Anchor {
  top:   number;
  right: number;
}

interface ModalProps {
  onClose:        () => void;
  title:          string;
  children:       React.ReactNode;
  footer?:        React.ReactNode;
  anchor?:        Anchor;
  closeDisabled?: boolean;
  /** True if there are unsaved local edits. Instead of a native confirm(),
      Modal swaps itself into a "Discard unsaved changes?" view — same
      shell, no browser dialog. */
  isDirty?:       boolean;
  /** Custom message for the discard-confirm view. Falls back to a
      generic one if not provided. */
  confirmDiscardMessage?: string;
  maxWidth?:      string;
  maximizable?:   boolean;
  persistKey?:    string;
}

export default function Modal({
  onClose,
  title,
  children,
  footer,
  anchor,
  closeDisabled = false,
  isDirty = false,
  confirmDiscardMessage,
  maxWidth = '600px',
  maximizable = false,
  persistKey,
}: ModalProps) {
  const { register, unregister, isCovered } = useDropdown();
  const { focusAssistance } = useSettings();
  const panelRef         = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const layerIdRef       = useRef<string | null>(null);
  const [maximized, setMaximized] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  function attemptClose() {
    if (closeDisabled) return;
    if (isDirty && !confirmingDiscard) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  }

  // While the discard-confirm view is showing, Escape and outside-click
  // go back to editing rather than risking an accidental full close —
  // only the explicit "Discard" button actually discards.
  function handleDismissAttempt() {
    if (confirmingDiscard) {
      setConfirmingDiscard(false);
      return;
    }
    attemptClose();
  }

  useEscapeKey(handleDismissAttempt, !closeDisabled);

  // Register with the shared dropdown/dialog stack for every modal — not
  // just anchored ones. This is what lets `isCovered` below tell us when
  // something (like a mention autocomplete dropdown) has opened on top of
  // this modal, so we can dim our own content instead of relying on
  // Focus Assistance's page-level backdrop, which can never render above
  // an already-open modal (it sits at a lower z-index by design).
  useEffect(() => {
    layerIdRef.current = register('modal');
    return () => {
      if (layerIdRef.current) unregister(layerIdRef.current);
      layerIdRef.current = null;
    };
  }, [register, unregister]);

  const coveredByNestedLayer = focusAssistance && !!layerIdRef.current && isCovered(layerIdRef.current);

  useEffect(() => {
    if (!anchor) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        handleDismissAttempt();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [anchor, closeDisabled, confirmingDiscard]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    panelRef.current?.focus();
    return () => {
      previousFocusRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (!maximizable || !persistKey) return;
    try {
      const saved = localStorage.getItem(`as-modal-maximized-${persistKey}`);
      if (saved) setMaximized(saved === 'true');
    } catch {}
  }, [maximizable, persistKey]);

  function toggleMaximized() {
    setMaximized(prev => {
      const next = !prev;
      if (persistKey) {
        try { localStorage.setItem(`as-modal-maximized-${persistKey}`, String(next)); } catch {}
      }
      return next;
    });
  }

  const effectiveMaxWidth = maximized ? '98vw' : maxWidth;
  const displayTitle   = confirmingDiscard ? 'Discard Unsaved Changes?' : title;
  const displayMessage = confirmDiscardMessage
    ?? 'You have unsaved changes. Closing now will discard them, and this can’t be undone.';

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={displayTitle}
      aria-modal="true"
      tabIndex={-1}
      className={anchor ? 'modal-panel' : 'modal'}
      style={anchor ? {
        top:       anchor.top,
        right:     anchor.right,
        maxHeight: `calc(100vh - ${anchor.top + 16}px)`,
      } : {
        maxWidth:  effectiveMaxWidth,
        maxHeight: maximized ? '96vh' : '90vh',
        // Needed as a containing block for the nested-layer dimming
        // overlay below (position: absolute; inset: 0). Anchored modals
        // already get this for free from .modal-panel's position: fixed.
        position:  'relative',
      }}
    >
      <div className={anchor ? 'modal-panel__header' : 'modal__header'}>
        <h2 className={anchor ? 'modal-panel__title' : 'modal__title'}>{displayTitle}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {!anchor && !confirmingDiscard && maximizable && (
            <button
              className={anchor ? 'modal-panel__close' : 'modal__close'}
              aria-label={maximized ? `Restore ${title}` : `Maximize ${title}`}
              title={maximized ? 'Restore' : 'Maximize'}
              onClick={toggleMaximized}
            >
              {maximized ? '⤡' : '⤢'}
            </button>
          )}
          <button
            className={anchor ? 'modal-panel__close' : 'modal__close'}
            aria-label={confirmingDiscard ? 'Keep editing' : `Close ${title}`}
            onClick={handleDismissAttempt}
          >
            ✕
          </button>
        </div>
      </div>

      <div className={anchor ? 'modal-panel__body' : 'modal__body'}>
        {confirmingDiscard ? (
          <p style={{ margin: 0, color: 'var(--as-text)', fontSize: 'var(--as-text-sm)' }}>
            {displayMessage}
          </p>
        ) : children}
      </div>

      {confirmingDiscard ? (
        <div className="modal__footer" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => setConfirmingDiscard(false)}>
            Keep Editing
          </button>
          <button className="btn btn--danger" style={{ flex: 1 }} onClick={onClose}>
            Discard
          </button>
        </div>
      ) : footer && (
        <div className="modal__footer">
          {footer}
        </div>
      )}

      {/* Dims this modal's own content when something (e.g. a mention
          autocomplete dropdown) has opened on top of it. Focus Assistance's
          page-level backdrop can't reach here — it renders below the
          modal's z-index by design — so each modal handles this itself,
          scoped to its own panel, via the shared layer stack. */}
      {coveredByNestedLayer && (
        <div
          aria-hidden="true"
          style={{
            position:       'absolute',
            inset:          0,
            zIndex:         10,
            background:     'var(--as-overlay)',
            backdropFilter: 'blur(2px)',
            borderRadius:   'inherit',
            pointerEvents:  'none',
          }}
        />
      )}
    </div>
  );

  if (anchor) {
    return createPortal(panel, document.body);
  }

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget) handleDismissAttempt(); }}
    >
      {panel}
    </div>,
    document.body
  );
}