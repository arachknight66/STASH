'use client';

import { useEffect } from 'react';
import { useAppStore, type Page } from '@/store/app';
import { haptics } from '@/lib/haptics';

export function useKeyboardShortcuts(onShowCheatsheet: () => void) {
  const navigate = useAppStore((s) => s.navigate);
  const setPendingFabAction = useAppStore((s) => s.setPendingFabAction);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in inputs/textareas
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Navigation: 1-5
      if (['1', '2', '3', '4', '5'].includes(key)) {
        haptics.light();
        const pages: Page[] = ['dash', 'feed', 'buckets', 'bills', 'vault'];
        const targetPage = pages[parseInt(key) - 1];
        if (targetPage) {
          navigate(targetPage);
        }
      }

      // Quick Spend: N
      if (key === 'n') {
        haptics.light();
        e.preventDefault();
        navigate('dash');
        setTimeout(() => {
          setPendingFabAction('quick_spend');
        }, 80);
      }

      // Load Up: I
      if (key === 'i') {
        haptics.light();
        e.preventDefault();
        navigate('dash');
        setTimeout(() => {
          setPendingFabAction('load_up');
        }, 80);
      }

      // Cheatsheet: ? (or Shift + /)
      if (key === '?' || (e.shiftKey && e.key === '?')) {
        haptics.light();
        e.preventDefault();
        onShowCheatsheet();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, setPendingFabAction, onShowCheatsheet]);
}
