'use client';

import { useEffect } from 'react';

const escapeStack: Array<() => void> = [];

/**
 * Shared escape-key stack. Each mounted dialog pushes its close
 * handler on mount, pops it on unmount. A keydown only fires the
 * TOPMOST (most recently mounted) entry — so with two dialogs open
 * simultaneously, Escape closes only the front-most one, not both
 * at once.
 *
 * Pass enabled={false} to temporarily suspend (e.g. while an async
 * save/upload is in progress and closing would be unsafe).
 */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    escapeStack.push(onEscape);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && escapeStack[escapeStack.length - 1] === onEscape) {
        onEscape();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const idx = escapeStack.lastIndexOf(onEscape);
      if (idx !== -1) escapeStack.splice(idx, 1);
    };
  }, [onEscape, enabled]);
}