"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface DropdownContextValue {
  openCount: number;
  register:   () => void;
  unregister: () => void;
}

const DropdownContext = createContext<DropdownContextValue>({
  openCount:  0,
  register:   () => {},
  unregister: () => {},
});

export function DropdownProvider({ children }: { children: ReactNode }) {
  const [openCount, setOpenCount] = useState(0);
  const register   = useCallback(() => setOpenCount(n => n + 1), []);
  const unregister = useCallback(() => setOpenCount(n => Math.max(0, n - 1)), []);

  return (
    <DropdownContext.Provider value={{ openCount, register, unregister }}>
      {children}
    </DropdownContext.Provider>
  );
}

export function useDropdown() {
  return useContext(DropdownContext);
}