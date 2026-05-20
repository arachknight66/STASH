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

      {currentPage === 'dash'    && <DashPage    />}
      {currentPage === 'feed'    && <FeedPage    />}
      {currentPage === 'buckets' && <BucketsPage />}
      {currentPage === 'intel'   && <IntelPage   />}

      <BottomNav />
      <Toast />
    </>
  );
}
