'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/app';
import { useNotifications } from '@/hooks/useStash';
import NotifDrawer from '@/components/ui/NotifDrawer';
import SettingsPanel from '@/components/ui/SettingsPanel';

export default function Header() {
  const navigate      = useAppStore((s) => s.navigate);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: notifications = [] }  = useNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <header className="bg-[#f6f6f6] border-b-4 border-[#0c0f0f] shadow-[4px_4px_0px_0px_rgba(12,15,15,1)] flex justify-between items-center w-full px-6 py-4 sticky top-0 z-50">
        <button
          onClick={() => navigate('dash')}
          className="text-3xl font-black italic text-[#0c0f0f] underline decoration-[#cafd00] decoration-4 font-headline uppercase tracking-tighter select-none cursor-pointer bg-transparent border-none"
        >
          STASH
        </button>

        <div className="flex gap-3">
          {/* Notifications */}
          <button
            id="notif-btn"
            onClick={() => setNotifOpen((p) => !p)}
            className="relative p-2 border-2 border-[#0c0f0f] bg-white hard-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-[#0c0f0f] text-2xl">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Settings */}
          <button
            id="settings-btn"
            onClick={() => setSettingsOpen(true)}
            className="p-2 border-2 border-[#0c0f0f] bg-white hard-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            aria-label="Settings"
          >
            <span className="material-symbols-outlined text-[#0c0f0f] text-2xl">settings</span>
          </button>
        </div>
      </header>

      <NotifDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
