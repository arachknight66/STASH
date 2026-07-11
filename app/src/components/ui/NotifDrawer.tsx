'use client';

import { useAppStore, type Page } from '@/store/app';
import { useNotifications, useClearNotifications } from '@/hooks/useStash';
import type { Notification } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

const NOTIF_ICONS: Record<string, string> = {
  BUCKET_MILESTONE: 'bolt',
  BUDGET_ALERT: 'warning',
  PAYDAY: 'payments',
  WEEKLY_DIGEST: 'insights',
  GENERAL: 'notifications',
};

const NOTIF_ICON_COLORS: Record<string, string> = {
  BUCKET_MILESTONE: 'text-primary',
  BUDGET_ALERT: 'text-error',
  PAYDAY: 'text-tertiary',
  WEEKLY_DIGEST: 'text-[#ffbdf3]',
  GENERAL: 'text-on-surface-variant',
};

// Map notification link strings to valid Page values
// Handles legacy link values like "dash", "buckets", "bills", "subs", "intel", "feed"
function resolvePage(link: string | null | undefined): Page | null {
  const valid: Page[] = ['dash', 'feed', 'buckets', 'bills', 'subs', 'vault', 'intel'];
  if (!link) return null;
  // Strip leading slash if present
  const clean = link.replace(/^\//, '').toLowerCase() as Page;
  return valid.includes(clean) ? clean : null;
}

interface NotifDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function NotifDrawer({ open, onClose }: NotifDrawerProps) {
  const navigate = useAppStore((s) => s.navigate);
  const setWeeklyDigestOpen = useAppStore((s) => s.setWeeklyDigestOpen);
  const { data: notifications = [], isLoading } = useNotifications();
  const clear = useClearNotifications();

  const unread = notifications.filter((n) => !n.isRead);

  function handleClear() {
    clear.mutate();
    onClose();
  }

  function handleNotifClick(n: Notification) {
    if (n.type === 'WEEKLY_DIGEST') {
      setWeeklyDigestOpen(true);
      onClose();
      return;
    }
    const page = resolvePage(n.link);
    if (page) navigate(page);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Invisible click-away layer */}
          <motion.div
            key="notif-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[55]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.div
            key="notif-drawer"
            id="notif-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed top-[69px] right-4 z-[60] w-80 bg-white dark:bg-[#11171a] border-4 border-inverse-surface hard-shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b-2 border-inverse-surface">
              <div className="flex items-center gap-2">
                <span className="font-headline font-black uppercase text-sm">
                  Notifications
                </span>
                {unread.length > 0 && (
                  <span className="bg-error text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    {unread.length}
                  </span>
                )}
              </div>
              <button
                onClick={handleClear}
                disabled={clear.isPending || notifications.length === 0}
                className="font-bold text-xs text-on-surface-variant uppercase hover:text-error transition-colors disabled:opacity-40 cursor-pointer"
              >
                Clear all
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[420px] overflow-y-auto">
              {isLoading ? (
                /* Skeleton */
                <div className="p-4 space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-5 h-5 bg-surface-container rounded-sm shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-3/4 bg-surface-container" />
                        <div className="h-2.5 w-full bg-surface-container" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-2xl mb-2">✓</p>
                  <p className="text-sm font-bold text-on-surface-variant">
                    All clear — no new notifications.
                  </p>
                </div>
              ) : (
                <div className="divide-y-2 divide-outline-variant">
                  <AnimatePresence initial={false}>
                    {notifications.map((n) => (
                      <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <button
                          onClick={() => handleNotifClick(n)}
                          className={[
                            'w-full text-left px-4 py-3 flex gap-3 items-start',
                            'hover:bg-surface-container transition-colors cursor-pointer',
                            !n.isRead ? 'bg-surface-container-low' : '',
                          ].join(' ')}
                        >
                          <span
                            className={`material-symbols-outlined text-xl mt-0.5 shrink-0 ${NOTIF_ICON_COLORS[n.type] ?? 'text-on-surface-variant'
                              }`}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                            aria-hidden="true"
                          >
                            {NOTIF_ICONS[n.type] ?? 'notifications'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm leading-tight ${!n.isRead ? 'font-black' : 'font-bold'
                                }`}
                            >
                              {n.title}
                            </p>
                            <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">
                              {n.body}
                            </p>
                          </div>
                          {!n.isRead && (
                            <span
                              className="mt-1.5 w-2 h-2 rounded-full bg-error shrink-0"
                              aria-label="Unread"
                            />
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}