'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CurrencyCode } from '@/lib/currencies';

export type Page =
  | 'dash'
  | 'feed'
  | 'buckets'
  | 'bills'
  | 'vault'
  | 'subs'
  | 'intel'
  | 'budgets';

export type FabAction = 'quick_spend' | 'load_up' | 'boost' | null;

interface AppState {
  currentPage: Page;
  darkMode: boolean;
  currency: CurrencyCode;
  toast: { message: string; id: number; type?: 'success' | 'error' | 'info' } | null;
  pendingFabAction: FabAction;

  navigate: (page: Page) => void;
  setDarkMode: (enabled: boolean) => void;
  setCurrency: (code: CurrencyCode) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: () => void;
  setPendingFabAction: (action: FabAction) => void;
  clearPendingFabAction: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentPage: 'dash',
      darkMode: false,
      currency: 'USD',
      toast: null,
      pendingFabAction: null,

      navigate: (page) => set({ currentPage: page }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setCurrency: (currency) => set({ currency }),
      showToast: (message, type = 'success') =>
        set({ toast: { message, id: Date.now(), type } }),
      dismissToast: () => set({ toast: null }),
      setPendingFabAction: (action) => set({ pendingFabAction: action }),
      clearPendingFabAction: () => set({ pendingFabAction: null }),
    }),
    {
      name: 'stash-app',
      partialize: (s) => ({ darkMode: s.darkMode, currency: s.currency }),
    },
  ),
);