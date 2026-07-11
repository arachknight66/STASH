'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app';
import { useTransactions, useBuckets, useStats } from '@/hooks/useStash';
import { formatMoney } from '@/lib/currencies';
import { CATEGORY_META } from '@/lib/constants';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface WeeklyDigestSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function WeeklyDigestSheet({ open, onClose }: WeeklyDigestSheetProps) {
  const currency = useAppStore((s) => s.currency);
  const reducedMotion = useReducedMotion();

  const { data: txData } = useTransactions({ limit: '100' });
  const { data: buckets = [] } = useBuckets();
  const { data: stats } = useStats();

  const txs = txData?.items ?? [];

  // 1. Calculate streak
  const streak = useMemo(() => {
    if (txs.length === 0) return 0;
    const days = new Set<string>();
    txs.forEach((tx) => {
      const d = new Date(tx.createdAt);
      days.add(d.toDateString());
    });

    let s = 0;
    const current = new Date();
    let checkDate = new Date(current.toDateString());
    if (!days.has(checkDate.toDateString())) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (days.has(checkDate.toDateString())) {
      s++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return s;
  }, [txs]);

  // 2. Top spending category this week
  const topCategory = useMemo(() => {
    if (!stats || !stats.categoryBreakdown) return null;
    const breakdown = stats.categoryBreakdown as Record<string, number>;
    const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : null;
  }, [stats]);

  // 3. Savings progress this week (boosts/saved in SAVINGS category last 7 days)
  const savingsThisWeek = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Check SAVINGS category transactions or transfers in last 7 days
    const savingsTxs = txs.filter((tx) => {
      const txDate = new Date(tx.createdAt);
      return txDate >= oneWeekAgo && (tx.category === 'SAVINGS' || tx.merchant.toLowerCase().includes('stash') || tx.merchant.toLowerCase().includes('boost'));
    });

    return savingsTxs.reduce((sum, tx) => sum + tx.amount, 0);
  }, [txs]);

  // 4. AI encouragement paragraph
  const aiEncouragement = useMemo(() => {
    if (streak >= 3) {
      return `Look at you, absolute legend! You're on a solid ${streak}-day logging streak, keeping your finances locked in. Your savings progress is moving in the right direction. Keep stashing like a boss!`;
    }
    if (savingsThisWeek > 0) {
      return `Decent progress this week! You stashed ${formatMoney(savingsThisWeek, currency)} away for future-you. Keep logging those transactions to build that habit loop!`;
    }
    return `No stress, every week is a fresh page. Take 2 minutes today to log your recent spend and set a quick savings goal. Future-you will be hyped!`;
  }, [streak, savingsThisWeek, currency]);

  const catMeta = topCategory ? CATEGORY_META[topCategory] : null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer Sheet */}
          <motion.div
            initial={{ y: reducedMotion ? 0 : '100%', opacity: reducedMotion ? 0 : 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reducedMotion ? 0 : '100%', opacity: reducedMotion ? 0 : 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-[105] max-w-lg mx-auto bg-white dark:bg-[#161d22] border-4 border-b-0 border-inverse-surface hard-shadow-lg max-h-[85dvh] flex flex-col"
          >
            {/* Handle strip */}
            <div className="flex justify-center pt-3 pb-1 shrink-0" onClick={onClose}>
              <div className="w-12 h-1 bg-inverse-surface/20 rounded-full cursor-pointer" />
            </div>

            {/* Scrollable container */}
            <div className="flex-1 overflow-y-auto px-6 pb-8 pt-4 space-y-6">
              <div>
                <span className="font-headline font-black text-xs uppercase tracking-widest text-primary-dim">
                  WEEKLY RECAP
                </span>
                <h3 className="font-headline font-black text-3xl uppercase tracking-tight italic mt-1 leading-none">
                  LOCKED IN DIGEST
                </h3>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Streak card */}
                <div className="bg-[#cafd00] border-4 border-inverse-surface hard-shadow-sm p-4 text-inverse-surface">
                  <p className="font-headline font-black text-[10px] uppercase tracking-wider opacity-60">
                    STREAK STATUS
                  </p>
                  <p className="font-headline font-black text-2xl uppercase mt-2">
                    🔥 {streak} DAYS
                  </p>
                  <p className="font-body font-bold text-[9px] uppercase tracking-wide opacity-50 mt-1">
                    Consecutive logs
                  </p>
                </div>

                {/* Savings progress card */}
                <div className="bg-[#bba2ff] border-4 border-inverse-surface hard-shadow-sm p-4 text-inverse-surface">
                  <p className="font-headline font-black text-[10px] uppercase tracking-wider opacity-60">
                    STASHED THIS WEEK
                  </p>
                  <p className="font-headline font-black text-2xl uppercase mt-2">
                    +{formatMoney(savingsThisWeek, currency)}
                  </p>
                  <p className="font-body font-bold text-[9px] uppercase tracking-wide opacity-50 mt-1">
                    Sent to buckets
                  </p>
                </div>

                {/* Top spending category */}
                <div className="col-span-2 bg-[#ffbdf3] border-4 border-inverse-surface hard-shadow-sm p-4 text-inverse-surface flex justify-between items-center">
                  <div>
                    <p className="font-headline font-black text-[10px] uppercase tracking-wider opacity-60">
                      TOP SPEND CATEGORY
                    </p>
                    <p className="font-headline font-black text-2xl uppercase mt-2">
                      {catMeta ? `${catMeta.emoji} ${catMeta.label}` : 'None logged'}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-4xl opacity-50 leading-none">
                    trending_up
                  </span>
                </div>
              </div>

              {/* AI Encourgement block */}
              <div className="bg-surface-container border-4 border-inverse-surface p-5">
                <p className="font-headline font-black uppercase text-[10px] tracking-[0.18em] mb-2 flex items-center gap-1.5 text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                    psychology
                  </span>
                  AI FINANCIAL DIGEST
                </p>
                <p className="font-bold text-sm leading-snug">{aiEncouragement}</p>
              </div>

              {/* CLOSE CTA */}
              <button
                onClick={onClose}
                className="w-full bg-[#cafd00] text-inverse-surface border-4 border-inverse-surface py-4 font-headline font-black uppercase text-base hover:-translate-y-0.5 transition-transform cursor-pointer text-center"
              >
                GOT IT, LETS STASH →
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
