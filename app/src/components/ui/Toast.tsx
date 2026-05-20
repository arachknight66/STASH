'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/app';

export default function Toast() {
  const toast = useAppStore((s) => s.toast);
  const dismiss = useAppStore((s) => s.dismissToast);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismiss, 2400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast, dismiss]);

  return (
    <div
      aria-live="polite"
      className={[
        'fixed top-[80px] left-1/2 -translate-x-1/2 z-[999]',
        'bg-inverse-surface text-white px-5 py-2',
        'font-headline font-bold text-sm uppercase hard-shadow whitespace-nowrap',
        'transition-all duration-300',
        toast ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
      ].join(' ')}
    >
      {toast?.message}
    </div>
  );
}
