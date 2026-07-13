'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/lib/haptics';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Wait 30 seconds of session activity before presenting prompt
      const timer = setTimeout(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        if (!isStandalone) {
          setShowPrompt(true);
        }
      }, 30000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    haptics.light();
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    haptics.light();
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          className="fixed left-4 right-4 z-[90] bg-[#cafd00] border-4 border-inverse-surface p-5 hard-shadow text-inverse-surface max-w-sm mx-auto"
          style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-headline font-black text-sm uppercase tracking-wider">
              INSTALL STASH APP
            </h4>
            <button
              onClick={handleDismiss}
              className="cursor-pointer font-bold text-sm leading-none hover:text-error transition-colors"
              aria-label="Dismiss install prompt"
            >
              ✕
            </button>
          </div>
          <p className="font-body font-bold text-[11px] uppercase tracking-wide opacity-80 leading-snug">
            Add STASH to your home screen for instant access, offline tracking, and native haptics.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleInstall}
              className="cursor-pointer font-headline font-black text-xs uppercase bg-white border-2 border-inverse-surface px-4 py-2 hover:bg-secondary-container transition-colors"
            >
              INSTALL NOW →
            </button>
            <button
              onClick={handleDismiss}
              className="cursor-pointer font-headline font-black text-xs uppercase underline opacity-60 hover:opacity-100 transition-opacity"
            >
              Not now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
