'use client';

import { useAppStore, type Page } from '@/store/app';
import { motion } from 'framer-motion';

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dash',    label: 'DASH',    icon: 'grid_view'        },
  { id: 'feed',    label: 'FEED',    icon: 'forum'            },
  { id: 'buckets', label: 'BUCKETS', icon: 'shopping_basket'  },
  { id: 'bills',   label: 'BILLS',   icon: 'receipt_long'     },
  { id: 'subs',    label: 'SUBS',    icon: 'autorenew'        },
  { id: 'intel',   label: 'INTEL',   icon: 'analytics'        },
];

export default function BottomNav() {
  const current  = useAppStore((s) => s.currentPage);
  const navigate = useAppStore((s) => s.navigate);

  return (
    <nav className="fixed bottom-0 left-0 w-full h-16 grid items-stretch overflow-hidden bg-[#cafd00] border-t-4 border-[#0c0f0f] z-50"
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
              'nav-btn relative flex flex-col items-center justify-center text-[#0c0f0f] h-full',
              i < NAV_ITEMS.length - 1 ? 'border-r-2 border-[#0c0f0f]' : '',
              'hover:bg-[#bba2ff]/40 transition-colors cursor-pointer outline-none select-none overflow-hidden',
            ].join(' ')}
          >
            {isActive && (
              <motion.div
                layoutId="activeNavPill"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 bg-[#ffbdf3] dark:bg-[#203a46]"
              />
            )}
            <motion.div
              whileTap={{ y: 2 }}
              className="relative z-10 flex flex-col items-center justify-center pointer-events-none"
            >
              <span
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: isActive ? "'FILL' 1,'wght' 700,'GRAD' 0,'opsz' 48" : "'FILL' 0,'wght' 700,'GRAD' 0,'opsz' 48" }}
              >
                {item.icon}
              </span>
              <span className="font-headline font-black text-[8px] uppercase tracking-tighter mt-0.5 leading-none">
                {item.label}
              </span>
            </motion.div>
          </button>
        );
      })}
    </nav>
  );
}
