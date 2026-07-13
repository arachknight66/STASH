'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/app';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/lib/haptics';

const TOAST_STYLES = {
  success: {
    bg: 'bg-[#cafd00]',
    border: 'border-inverse-surface',
    text: 'text-inverse-surface',
    icon: 'check_circle',
    iconColor: 'text-primary-dim',
  },
  error: {
    bg: 'bg-error-container',
    border: 'border-error',
    text: 'text-on-error-container',
    icon: 'error',
    iconColor: 'text-error',
  },
  info: {
    bg: 'bg-tertiary-container',
    border: 'border-inverse-surface',
    text: 'text-on-surface',
    icon: 'info',
    iconColor: 'text-tertiary',
  },
} as const;

export default function Toast() {
  const toast = useAppStore((s) => s.toast);
  const dismiss = useAppStore((s) => s.dismissToast);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return;
    if (toast.type === 'error') {
      haptics.error();
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismiss, 2600);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, dismiss]);

  const style = TOAST_STYLES[(toast?.type ?? 'success') as keyof typeof TOAST_STYLES];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-[80px] left-0 right-0 z-[999] flex justify-center pointer-events-none px-4"
    >
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            onClick={dismiss}
            className={[
              'pointer-events-auto flex items-center gap-2.5',
              'border-4 hard-shadow px-5 py-2.5 cursor-pointer',
              'font-headline font-black text-sm uppercase tracking-wider whitespace-nowrap',
              style.bg,
              style.border,
              style.text,
            ].join(' ')}
          >
            <span
              className={`material-symbols-outlined text-lg leading-none ${style.iconColor}`}
              style={{ fontVariationSettings: "'FILL' 1,'wght' 700,'GRAD' 0,'opsz' 48" }}
            >
              {style.icon}
            </span>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}