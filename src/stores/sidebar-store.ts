import { create } from "zustand";
import { persist } from "zustand/middleware";

/*
 * UI-only store for the desktop sidebar collapse state (rail vs full).
 * Persisted so the user's choice survives reloads. Client/presentation
 * state only — never holds server data.
 */
interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    { name: "fitly-admin-sidebar" },
  ),
);
