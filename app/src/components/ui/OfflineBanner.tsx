'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="sticky top-[69px] z-40 w-full bg-error text-white font-headline font-black text-xs uppercase tracking-wider py-3 px-5 border-b-4 border-inverse-surface text-center flex items-center justify-center gap-2 select-none"
        >
          <span className="material-symbols-outlined text-sm leading-none animate-pulse">
            wifi_off
          </span>
          Offline Mode — Local tracking active until connection returns.
        </motion.div>
      )}
    </AnimatePresence>
  );
}
