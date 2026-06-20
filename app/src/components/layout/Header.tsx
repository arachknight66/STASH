'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/app';
import { useNotifications } from '@/hooks/useStash';
import NotifDrawer from '@/components/ui/NotifDrawer';
import SettingsPanel from '@/components/ui/SettingsPanel';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const navigate = useAppStore((s) => s.navigate);
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Close drawers on outside click / escape
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header className="bg-background dark:bg-[#0b0f11] border-b-4 border-inverse-surface sticky top-0 z-50 flex justify-between items-center w-full px-5 py-3.5">
        {/* Logo */}
        <button
          onClick={() => navigate('dash')}
          className="text-3xl font-black italic text-inverse-surface underline decoration-[#cafd00] decoration-4 font-headline uppercase tracking-tighter select-none cursor-pointer bg-transparent border-none leading-none"
          aria-label="Go to dashboard"
        >
          STASH
        </button>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button
            ref={notifBtnRef}
            id="notif-btn"
            onClick={() => {
              setNotifOpen((p) => !p);
              setSettingsOpen(false);
            }}
            className="relative w-10 h-10 border-2 border-inverse-surface bg-white dark:bg-[#161d22] hard-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center justify-center cursor-pointer"
            aria-label="Notifications"
            aria-expanded={notifOpen}
            aria-haspopup="true"
          >
            <span className="material-symbols-outlined text-inverse-surface text-xl leading-none">
              notifications
            </span>
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  className="absolute -top-1.5 -right-1.5 bg-error text-white text-[9px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-[#0b0f11]"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Settings */}
          <button
            id="settings-btn"
            onClick={() => {
              setSettingsOpen(true);
              setNotifOpen(false);
            }}
            className="w-10 h-10 border-2 border-inverse-surface bg-white dark:bg-[#161d22] hard-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center justify-center cursor-pointer"
            aria-label="Settings"
          >
            <span className="material-symbols-outlined text-inverse-surface text-xl leading-none">
              settings
            </span>
          </button>
        </div>
      </header>

      <NotifDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}