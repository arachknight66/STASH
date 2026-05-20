'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CurrencyCode } from '@/lib/currencies';

export type Page = 'dash' | 'feed' | 'buckets' | 'bills' | 'subs' | 'intel';

interface AppState {
  currentPage: Page;
  darkMode: boolean;
  currency: CurrencyCode;
  toast: { message: string; id: number } | null;

  navigate: (page: Page) => void;
  setDarkMode: (enabled: boolean) => void;
  setCurrency: (code: CurrencyCode) => void;
  showToast: (message: string) => void;
  dismissToast: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentPage: 'dash',
      darkMode: false,
      currency: 'USD',
      toast: null,

      navigate: (page) => set({ currentPage: page }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setCurrency: (currency) => set({ currency }),
      showToast: (message) => set({ toast: { message, id: Date.now() } }),
      dismissToast: () => set({ toast: null }),
    }),
    {
      name: 'stash-app',
      partialize: (s) => ({ darkMode: s.darkMode, currency: s.currency }),
    },
  ),
);
