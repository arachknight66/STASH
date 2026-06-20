'use client';

import { useAppStore } from '@/store/app';
import { useNotifications, useClearNotifications } from '@/hooks/useStash';
import type { Notification } from '@/lib/types';

const NOTIF_ICONS: Record<string, string> = {
  BUCKET_MILESTONE: 'bolt',
  BUDGET_ALERT: 'warning',
  PAYDAY: 'payments',
  GENERAL: 'notifications',
};
const NOTIF_COLORS: Record<string, string> = {
  BUCKET_MILESTONE: 'text-primary',
  BUDGET_ALERT: 'text-error',
  PAYDAY: 'text-tertiary',
  GENERAL: 'text-on-surface-variant',
};
const NOTIF_BG: Record<string, string> = {
  BUCKET_MILESTONE: 'bg-primary-container',
  BUDGET_ALERT: '',
  PAYDAY: '',
  GENERAL: '',
};

interface NotifDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function NotifDrawer({ open, onClose }: NotifDrawerProps) {
  const navigate = useAppStore((s) => s.navigate);
  const { data: notifications = [] } = useNotifications();
  const clear = useClearNotifications();

  const handleClear = () => {
    clear.mutate();
    onClose();
  };

  const handleNotifClick = (n: Notification) => {
    if (n.link) navigate(n.link as 'dash' | 'feed' | 'buckets' | 'intel');
    onClose();
  };

  return (
    <div
      id="notif-drawer"
      className={[
        'fixed top-[73px] right-4 z-[60] w-80 bg-white border-4 border-inverse-surface hard-shadow-lg',
        'transition-all duration-200',
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
      ].join(' ')}
    >
      <div className="flex justify-between items-center px-4 py-3 border-b-2 border-inverse-surface">
        <span className="font-headline font-black uppercase text-sm">Notifications</span>
        <button
          onClick={handleClear}
          className="font-bold text-xs text-on-surface-variant uppercase hover:text-error transition-colors"
        >
          Clear All
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm font-bold text-on-surface-variant">
          All clear! No new notifications.
        </div>
      ) : (
        <div className="divide-y-2 divide-outline-variant">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotifClick(n)}
              className={[
                'px-4 py-3 flex gap-3 items-start cursor-pointer hover:opacity-80',
                NOTIF_BG[n.type] ?? 'hover:bg-surface-container',
                !n.isRead ? 'font-black' : '',
              ].join(' ')}
            >
              <span className={`material-symbols-outlined text-xl mt-0.5 ${NOTIF_COLORS[n.type] ?? 'text-on-surface-variant'}`}>
                {NOTIF_ICONS[n.type] ?? 'notifications'}
              </span>
              <div>
                <p className="font-bold text-sm">{n.title}</p>
                <p className="text-xs text-on-surface-variant">{n.body}</p>
              </div>
              {!n.isRead && (
                <span className="ml-auto w-2 h-2 rounded-full bg-error mt-2 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
