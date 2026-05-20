'use client';

import { useAppStore } from '@/store/app';

type Page = 'dash' | 'feed' | 'buckets' | 'intel';

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dash',    label: 'DASH',    icon: 'grid_view'       },
  { id: 'feed',    label: 'FEED',    icon: 'forum'           },
  { id: 'buckets', label: 'BUCKETS', icon: 'shopping_basket' },
  { id: 'intel',   label: 'INTEL',   icon: 'analytics'       },
];

export default function BottomNav() {
  const current  = useAppStore((s) => s.currentPage);
  const navigate = useAppStore((s) => s.navigate);
  const darkMode = useAppStore((s) => s.darkMode);

  const activeBg = darkMode ? '#203a46' : '#ffbdf3';

  return (
    <nav className="fixed bottom-0 left-0 w-full h-20 grid grid-cols-4 items-stretch overflow-hidden bg-[#cafd00] border-t-4 border-[#0c0f0f] z-50">
      {NAV_ITEMS.map((item, i) => {
        const isActive = current === item.id;
        return (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            onClick={() => navigate(item.id)}
            style={isActive ? { background: activeBg } : {}}
            className={[
              'nav-btn flex flex-col items-center justify-center text-[#0c0f0f] h-full',
              i < NAV_ITEMS.length - 1 ? 'border-r-2 border-[#0c0f0f]' : '',
              'hover:bg-[#bba2ff] transition-colors',
            ].join(' ')}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: isActive ? "'FILL' 1,'wght' 700,'GRAD' 0,'opsz' 48" : "'FILL' 0,'wght' 700,'GRAD' 0,'opsz' 48" }}
            >
              {item.icon}
            </span>
            <span className="font-headline font-bold text-xs uppercase">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
