'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/app';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Toast from '@/components/ui/Toast';
import DashPage    from '@/components/pages/DashPage';
import FeedPage    from '@/components/pages/FeedPage';
import BucketsPage from '@/components/pages/BucketsPage';
import IntelPage   from '@/components/pages/IntelPage';
import { AnimatePresence, motion } from 'framer-motion';

export default function Home() {
  const currentPage = useAppStore((s) => s.currentPage);
  const darkMode    = useAppStore((s) => s.darkMode);

  // Sync dark mode to html class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <>
      <Header />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          {currentPage === 'dash'    && <DashPage    />}
          {currentPage === 'feed'    && <FeedPage    />}
          {currentPage === 'buckets' && <BucketsPage />}
          {currentPage === 'intel'   && <IntelPage   />}
        </motion.div>
      </AnimatePresence>

      <BottomNav />
      <Toast />
    </>
  );
}
