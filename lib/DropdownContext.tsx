'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type DialogLayerKind = 'modal' | 'dropdown';

interface Layer {
  id:   string;
  kind: DialogLayerKind;
}

interface DropdownContextValue {
  /** Total number of currently open layers (modals + dropdowns combined). */
  openCount: number;
  /**
   * Register a newly-opened layer (a modal, or a dropdown/popup). Layers
   * are tracked in the order they open, which is what lets `isCovered`
   * answer "is something else currently stacked on top of me?" — e.g. a
   * mention dropdown opening inside an already-open modal.
   *
   * Returns an id — pass that same id to `unregister` when the layer
   * closes.
   */
  register:   (kind?: DialogLayerKind) => string;
  unregister: (id: string) => void;
  /**
   * True when at least one other layer opened *after* this one and is
   * still open — i.e. this layer currently has something stacked on top
   * of it.
   */
  isCovered: (id: string) => boolean;
}

const DropdownContext = createContext<DropdownContextValue>({
  openCount:  0,
  register:   () => '',
  unregister: () => {},
  isCovered:  () => false,
});

let nextLayerId = 0;

export function DropdownProvider({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<Layer[]>([]);

  const register = useCallback((kind: DialogLayerKind = 'dropdown') => {
    const id = `layer-${++nextLayerId}`;
    setLayers(prev => [...prev, { id, kind }]);
    return id;
  }, []);

  const unregister = useCallback((id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
  }, []);

  const isCovered = useCallback(
    (id: string) => {
      const index = layers.findIndex(l => l.id === id);
      if (index === -1) return false;
      return index < layers.length - 1;
    },
    [layers]
  );

  return (
    <DropdownContext.Provider value={{ openCount: layers.length, register, unregister, isCovered }}>
      {children}
    </DropdownContext.Provider>
  );
}

export function useDropdown() {
  return useContext(DropdownContext);
}