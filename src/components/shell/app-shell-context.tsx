"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * App-shell coordination. Right now its only job is to let a mounted
 * Save bar tell the mobile BottomNav to hide itself, so an edit form
 * never has two competing footers fighting for the same row.
 */
interface AppShellState {
  saveBarCount: number;
  registerSaveBar(): void;
  releaseSaveBar(): void;
}

const AppShellContext = createContext<AppShellState | null>(null);

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [saveBarCount, setSaveBarCount] = useState(0);

  const registerSaveBar = useCallback(() => {
    setSaveBarCount((n) => n + 1);
  }, []);
  const releaseSaveBar = useCallback(() => {
    setSaveBarCount((n) => Math.max(0, n - 1));
  }, []);

  return (
    <AppShellContext.Provider
      value={{ saveBarCount, registerSaveBar, releaseSaveBar }}
    >
      {children}
    </AppShellContext.Provider>
  );
}

function useAppShell(): AppShellState {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    // Safe fallback so a stray render outside the provider does not
    // crash. The bottom-nav just stays visible and the save bar still
    // renders, just without coordination.
    return { saveBarCount: 0, registerSaveBar() {}, releaseSaveBar() {} };
  }
  return ctx;
}

/** True when at least one Save bar is currently mounted. */
export function useSaveBarMounted(): boolean {
  return useAppShell().saveBarCount > 0;
}

/** Register the calling Save bar for the lifetime of its mount. */
export function useRegisterSaveBar(): void {
  const { registerSaveBar, releaseSaveBar } = useAppShell();
  useEffect(() => {
    registerSaveBar();
    return () => releaseSaveBar();
  }, [registerSaveBar, releaseSaveBar]);
}
