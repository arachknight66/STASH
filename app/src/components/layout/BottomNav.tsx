'use client';

import { useAppStore, type Page } from '@/store/app';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';

// Merged BILLS + SUBS into VAULT, moved INTEL under more
const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dash', label: 'Dash', icon: 'grid_view' },
  { id: 'feed', label: 'Feed', icon: 'receipt_long' },
  { id: 'buckets', label: 'Buckets', icon: 'savings' },
  { id: 'bills', label: 'Bills', icon: 'receipt' },
  { id: 'intel', label: 'Intel', icon: 'analytics' },
];

// FAB quick actions
const FAB_ACTIONS: { id: string; label: string; icon: string; page?: Page; action?: string }[] = [
  { id: 'spend', label: 'Quick Spend', icon: 'bolt', action: 'quick_spend' },
  { id: 'income', label: 'Load Up', icon: 'add_card', action: 'load_up' },
  { id: 'subs', label: 'Subs', icon: 'autorenew', page: 'subs' },
  { id: 'bucket', label: 'Boost', icon: 'rocket_launch', action: 'boost' },
];

interface BottomNavProps {
  onFabAction?: (action: string) => void;
}

export default function BottomNav({ onFabAction }: BottomNavProps) {
  const current = useAppStore((s) => s.currentPage);
  const navigate = useAppStore((s) => s.navigate);
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  const handleFabAction = (item: typeof FAB_ACTIONS[0]) => {
    setFabOpen(false);
    if (item.page) {
      navigate(item.page);
    } else if (item.action && onFabAction) {
      onFabAction(item.action);
    }
  };

  return (
    <>
      {/* FAB overlay backdrop */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            key="fab-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-[2px]"
            onClick={() => setFabOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Action Menu */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            key="fab-menu"
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed bottom-[88px] right-4 z-[48] flex flex-col-reverse gap-3"
          >
            {FAB_ACTIONS.map((item, i) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: 12, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 8, scale: 0.92 }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 26,
                  delay: i * 0.04,
                }}
                onClick={() => handleFabAction(item)}
                className="flex items-center gap-3 self-end cursor-pointer group"
              >
                {/* Label */}
                <span className="bg-inverse-surface text-white dark:bg-white dark:text-inverse-surface font-headline font-black text-xs uppercase tracking-wider px-3 py-1.5 border-2 border-inverse-surface hard-shadow-sm whitespace-nowrap group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                  {item.label}
                </span>
                {/* Icon button */}
                <div className="w-12 h-12 bg-white border-4 border-inverse-surface hard-shadow flex items-center justify-center group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                  <span
                    className="material-symbols-outlined text-inverse-surface text-xl"
                    style={{ fontVariationSettings: "'FILL' 1,'wght' 700,'GRAD' 0,'opsz' 48" }}
                  >
                    {item.icon}
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <motion.button
        ref={fabRef}
        onClick={() => setFabOpen((p) => !p)}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-[84px] right-4 z-[49] w-14 h-14 bg-secondary border-4 border-inverse-surface hard-shadow cursor-pointer flex items-center justify-center"
        aria-label="Quick actions"
        aria-expanded={fabOpen}
      >
        <motion.span
          animate={{ rotate: fabOpen ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className="material-symbols-outlined text-white text-3xl select-none"
          style={{ fontVariationSettings: "'FILL' 1,'wght' 700,'GRAD' 0,'opsz' 48" }}
        >
          add
        </motion.span>
      </motion.button>

      {/* Bottom Nav Bar */}
      <nav
        className="fixed bottom-0 left-0 w-full z-50 bg-[#cafd00] dark:bg-[#1a2820] border-t-4 border-inverse-surface"
        style={{ height: '68px' }}
      >
        <div
          className="h-full grid relative"
          style={{ gridTemplateColumns: `repeat(${NAV_ITEMS.length}, 1fr)` }}
        >
          {NAV_ITEMS.map((item, i) => {
            const isActive = current === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => navigate(item.id)}
                className={[
                  'relative flex flex-col items-center justify-center h-full outline-none select-none cursor-pointer',
                  'transition-colors duration-100',
                  i < NAV_ITEMS.length - 1 ? 'border-r-2 border-inverse-surface/30' : '',
                ].join(' ')}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active pill background */}
                {isActive && (
                  <motion.div
                    layoutId="activeNavPill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-x-2 inset-y-1.5 bg-[#ffbdf3] dark:bg-[#1e3a2e] border-2 border-inverse-surface/60"
                  />
                )}

                {/* Press ripple effect */}
                <motion.div
                  className="relative z-10 flex flex-col items-center justify-center gap-[3px] pointer-events-none"
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                >
                  <span
                    className="material-symbols-outlined text-inverse-surface leading-none"
                    style={{
                      fontSize: '22px',
                      fontVariationSettings: isActive
                        ? "'FILL' 1,'wght' 700,'GRAD' 0,'opsz' 48"
                        : "'FILL' 0,'wght' 500,'GRAD' 0,'opsz' 48",
                      transition: 'font-variation-settings 0.15s ease',
                    }}
                  >
                    {item.icon}
                  </span>

                  {/* Label: always visible but styled differently for active */}
                  <span
                    className={[
                      'font-headline uppercase leading-none transition-all duration-150',
                      isActive
                        ? 'text-[9px] font-black tracking-widest opacity-100'
                        : 'text-[8px] font-bold tracking-wider opacity-60',
                    ].join(' ')}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}