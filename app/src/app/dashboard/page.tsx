'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/app';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Toast from '@/components/ui/Toast';
import DashPage from '@/components/pages/DashPage';
import FeedPage from '@/components/pages/FeedPage';
import BucketsPage from '@/components/pages/BucketsPage';
import BillsPage from '@/components/pages/BillsPage';
import SubsPage from '@/components/pages/SubsPage';
import IntelPage from '@/components/pages/IntelPage';
import { AnimatePresence, motion } from 'framer-motion';

export default function Home() {
  const currentPage = useAppStore((s) => s.currentPage);
  const darkMode = useAppStore((s) => s.darkMode);
  const navigate = useAppStore((s) => s.navigate);
  const setPendingFabAction = useAppStore((s) => s.setPendingFabAction);

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
        // Subs is a direct navigation, no modal needed
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

  return (
    <>
      <Header />

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
          {currentPage === 'intel' && <IntelPage />}
        </motion.div>
      </AnimatePresence>

      <BottomNav onFabAction={handleFabAction} />
      <Toast />
    </>
  );
}