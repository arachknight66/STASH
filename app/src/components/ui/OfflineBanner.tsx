'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineBanner() {
  const [status, setStatus] = useState<'online' | 'offline' | 'back-online'>('online');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setStatus(navigator.onLine ? 'online' : 'offline');
    }

    const handleOnline = () => {
      setStatus('back-online');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setStatus('online');
      }, 3000);
    };

    const handleOffline = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showBanner = status === 'offline' || status === 'back-online';

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`sticky top-[69px] z-40 w-full font-headline font-black text-xs uppercase tracking-wider py-3 px-5 border-b-4 border-inverse-surface text-center flex items-center justify-center gap-2 select-none ${
            status === 'back-online' ? 'bg-[#cafd00] text-inverse-surface' : 'bg-error text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm leading-none animate-pulse">
            {status === 'back-online' ? 'wifi' : 'wifi_off'}
          </span>
          {status === 'back-online'
            ? "You're back online! ✓ syncing..."
            : 'Offline Mode — Local tracking active until connection returns.'}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
