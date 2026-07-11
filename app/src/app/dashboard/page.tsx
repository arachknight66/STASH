'use client';

import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '@/store/app';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Toast from '@/components/ui/Toast';
import DashPage from '@/components/pages/DashPage';
import FeedPage from '@/components/pages/FeedPage';
import BucketsPage from '@/components/pages/BucketsPage';
import BillsPage from '@/components/pages/BillsPage';
import SubsPage from '@/components/pages/SubsPage';
import VaultPage from '@/components/pages/VaultPage';
import BudgetsPage from '@/components/pages/BudgetsPage';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useSettings } from '@/hooks/useStash';
import OnboardingWizard from '@/components/ui/OnboardingWizard';
import InstallPrompt from '@/components/ui/InstallPrompt';
import OfflineBanner from '@/components/ui/OfflineBanner';
import WeeklyDigestSheet from '@/components/ui/WeeklyDigestSheet';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import ActionModal from '@/components/ui/ActionModal';
import dynamic from 'next/dynamic';

const IntelPage = dynamic(() => import('@/components/pages/IntelPage'), {
  loading: () => (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="h-12 w-48 bg-surface-container border-2 border-inverse-surface animate-pulse" />
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 bg-surface-container border-2 border-inverse-surface animate-pulse" />
        ))}
      </div>
      <div className="h-[480px] bg-surface-container border-4 border-inverse-surface animate-pulse" />
    </div>
  ),
  ssr: false,
});

export default function Home() {
  const currentPage = useAppStore((s) => s.currentPage);
  const darkMode = useAppStore((s) => s.darkMode);
  const navigate = useAppStore((s) => s.navigate);
  const setPendingFabAction = useAppStore((s) => s.setPendingFabAction);
  const weeklyDigestOpen = useAppStore((s) => s.weeklyDigestOpen);
  const setWeeklyDigestOpen = useAppStore((s) => s.setWeeklyDigestOpen);

  const qc = useQueryClient();
  const { data: settings } = useSettings();

  const [shortcutsModal, setShortcutsModal] = useState<any>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // FAB handler — navigates to the right page then sets the pending action
  // so the mounted page can open the correct modal
  const handleFabAction = useCallback(
    (action: string) => {
      if (action === 'quick_spend' || action === 'load_up') {
        navigate('dash');
      } else if (action === 'boost') {
        navigate('buckets');
      } else if (action === 'subs') {
        navigate('subs');
        return;
      }
      // Delay slightly so the target page has time to mount before it
      // reads pendingFabAction from the store
      setTimeout(() => {
        setPendingFabAction(action as any);
      }, 80);
    },
    [navigate, setPendingFabAction],
  );

  const openShortcuts = useCallback(() => {
    setShortcutsModal({
      title: 'Keyboard Shortcuts',
      subtitle: 'Stash Pro Shortcuts',
      fields: [],
      onSubmit: () => true,
      description: (
        <div className="grid grid-cols-2 gap-4 font-headline uppercase text-xs pt-2">
          <div>
            <p className="font-black text-secondary">N — Quick Spend</p>
            <p className="text-on-surface-variant font-bold mt-1">Log a transaction</p>
          </div>
          <div>
            <p className="font-black text-secondary">I — Load Up</p>
            <p className="text-on-surface-variant font-bold mt-1">Load up money</p>
          </div>
          <div>
            <p className="font-black">1 — Dashboard</p>
            <p className="text-on-surface-variant font-bold mt-1">Go to Dash</p>
          </div>
          <div>
            <p className="font-black">2 — Feed</p>
            <p className="text-on-surface-variant font-bold mt-1">Go to Feed</p>
          </div>
          <div>
            <p className="font-black">3 — Buckets</p>
            <p className="text-on-surface-variant font-bold mt-1">Go to Buckets</p>
          </div>
          <div>
            <p className="font-black">4 — Bills</p>
            <p className="text-on-surface-variant font-bold mt-1">Go to Bills</p>
          </div>
          <div>
            <p className="font-black">5 — Vault</p>
            <p className="text-on-surface-variant font-bold mt-1">Go to Vault</p>
          </div>
          <div>
            <p className="font-black">? — This Menu</p>
            <p className="text-on-surface-variant font-bold mt-1">Show shortcuts</p>
          </div>
        </div>
      ),
    });
  }, []);

  useKeyboardShortcuts(openShortcuts);

  return (
    <>
      <Header />
      <OfflineBanner />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          className="pb-20"
        >
          {currentPage === 'dash' && <DashPage />}
          {currentPage === 'feed' && <FeedPage />}
          {currentPage === 'buckets' && <BucketsPage />}
          {currentPage === 'bills' && <BillsPage />}
          {currentPage === 'subs' && <SubsPage />}
          {currentPage === 'vault' && <VaultPage />}
          {currentPage === 'budgets' && <BudgetsPage />}
          {currentPage === 'intel' && <IntelPage />}
        </motion.div>
      </AnimatePresence>

      <BottomNav onFabAction={handleFabAction} />
      <Toast />
      <InstallPrompt />

      {/* Onboarding Wizard Overlay */}
      {settings && settings.hasOnboarded === false && (
        <OnboardingWizard
          userName={settings.user?.name || ''}
          onFinished={() => {
            qc.invalidateQueries({ queryKey: ['settings'] });
          }}
        />
      )}

      <ActionModal config={shortcutsModal} onClose={() => setShortcutsModal(null)} />
      <WeeklyDigestSheet open={weeklyDigestOpen} onClose={() => setWeeklyDigestOpen(false)} />
    </>
  );
}