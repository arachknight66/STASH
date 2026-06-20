'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/app';
import { useTransactions, useDeleteTransaction } from '@/hooks/useStash';
import { formatMoney } from '@/lib/currencies';
import { CATEGORY_META } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
} as const;

const CARD_THEMES = [
  'bg-primary-container',
  'bg-white',
  'bg-secondary-container',
  'bg-tertiary-container',
];

const TAG_COLORS = [
  'bg-primary-container',
  'bg-secondary-container',
  'bg-tertiary-container',
  'bg-surface-container-high',
];

const CATEGORIES = ['FOOD', 'DRIP', 'ENTERTAINMENT', 'COFFEE', 'TRANSPORT', 'INCOME'] as const;

// Consistent date formatting — avoids locale mismatch between server/client
function formatTxDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Skeleton card that matches the real transaction card dimensions
function TransactionSkeleton() {
  return (
    <div className="bg-white border-4 border-inverse-surface p-6 space-y-4 animate-pulse">
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-surface-container border-2 border-inverse-surface shrink-0" />
          <div className="space-y-2">
            <div className="h-5 w-36 bg-surface-container" />
            <div className="h-3 w-24 bg-surface-container" />
          </div>
        </div>
        <div className="space-y-2 text-right">
          <div className="h-7 w-24 bg-surface-container ml-auto" />
          <div className="h-3 w-16 bg-surface-container ml-auto" />
        </div>
      </div>
      {/* Tags row */}
      <div className="flex gap-2">
        <div className="h-6 w-20 bg-surface-container" />
        <div className="h-6 w-24 bg-surface-container" />
      </div>
      {/* Insight box */}
      <div className="h-14 bg-surface-container" />
    </div>
  );
}

export default function FeedPage() {
  const currency = useAppStore((s) => s.currency);
  const showToast = useAppStore((s) => s.showToast);

  const [activeCategory, setActiveCategory] = useState<string>('');

  const params: Record<string, string> = {};
  if (activeCategory) params.category = activeCategory;

  const { data, isLoading, refetch } = useTransactions(params);
  const deleteTx = useDeleteTransaction();

  const transactions = data?.items ?? [];
  const total = data?.total ?? 0;

  // Toggle category — clicking the active one resets to all
  function handleCategoryToggle(cat: string) {
    setActiveCategory((prev) => (prev === cat ? '' : cat));
  }

  return (
    <motion.main
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-3xl mx-auto px-4 pt-8 pb-8"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="mb-8 flex justify-between items-end gap-4 flex-wrap"
      >
        <div>
          <h1 className="font-headline font-black text-6xl tracking-tighter uppercase leading-none">
            SMART FEED
          </h1>
          <p className="font-bold text-on-surface-variant uppercase tracking-[0.18em] text-xs mt-2">
            {isLoading
              ? 'Loading transactions...'
              : `${total} transaction${total !== 1 ? 's' : ''}${activeCategory ? ` in ${activeCategory}` : ''}`}
          </p>
        </div>
        <div className="bg-secondary-container border-2 border-inverse-surface px-4 py-2 hard-shadow-sm font-headline font-bold text-sm italic">
          AI PATTERN WATCH
        </div>
      </motion.div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory('')}
          className={[
            'border-2 border-inverse-surface px-3 py-1.5 font-headline font-black text-xs uppercase transition-colors cursor-pointer',
            !activeCategory
              ? 'bg-primary-container'
              : 'bg-white hover:bg-surface-container',
          ].join(' ')}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryToggle(cat)}
            className={[
              'border-2 border-inverse-surface px-3 py-1.5 font-headline font-black text-xs uppercase transition-colors cursor-pointer',
              activeCategory === cat
                ? 'bg-primary-container'
                : 'bg-white hover:bg-surface-container',
            ].join(' ')}
          >
            {CATEGORY_META[cat]?.emoji} {cat}
          </button>
        ))}

        {/* Clear filter chip — only shown when a filter is active */}
        <AnimatePresence>
          {activeCategory && (
            <motion.button
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 400, damping: 26 }}
              onClick={() => setActiveCategory('')}
              className="border-2 border-error text-error px-3 py-1.5 font-headline font-black text-xs uppercase cursor-pointer hover:bg-error hover:text-white transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm leading-none">close</span>
              Clear
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Skeleton loaders ────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <TransactionSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ── Empty state — only shown after load completes ───────────────── */}
      {!isLoading && transactions.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-white border-4 border-inverse-surface p-12 text-center"
        >
          <p className="text-4xl mb-3">📭</p>
          <p className="font-headline font-black text-2xl uppercase mb-2">
            {activeCategory ? `No ${activeCategory} transactions` : 'Nothing here yet.'}
          </p>
          <p className="text-on-surface-variant font-bold text-sm">
            {activeCategory
              ? `Try a different category, or log a ${activeCategory.toLowerCase()} transaction from the dashboard.`
              : 'Log a transaction from the dashboard to get started.'}
          </p>
          {activeCategory && (
            <button
              onClick={() => setActiveCategory('')}
              className="mt-6 border-2 border-inverse-surface px-5 py-2 font-headline font-black text-xs uppercase hover:bg-surface-container transition-colors cursor-pointer"
            >
              Show all transactions
            </button>
          )}
        </motion.div>
      )}

      {/* ── Transaction feed ────────────────────────────────────────────── */}
      {!isLoading && transactions.length > 0 && (
        <motion.div className="space-y-6" variants={containerVariants}>
          <AnimatePresence mode="popLayout">
            {transactions.map((tx, i) => {
              const meta = CATEGORY_META[tx.category] ?? CATEGORY_META.OTHER;
              const isInc = tx.type === 'INCOME';
              const cardBg = CARD_THEMES[i % CARD_THEMES.length];
              const tags = (tx.tags as string[]) ?? [];
              const isOptimistic = (tx as any).isOptimistic;

              return (
                <motion.article
                  key={tx.id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                  className={[
                    'interactive-lift border-4 border-inverse-surface p-6 hard-shadow',
                    cardBg,
                    isOptimistic
                      ? 'pulse-sync opacity-60 border-dashed bg-surface-container'
                      : '',
                  ].join(' ')}
                >
                  {/* Top row: merchant + amount */}
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-14 h-14 shrink-0 bg-white border-2 border-inverse-surface flex items-center justify-center text-3xl hard-shadow-sm">
                        {meta.emoji}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-headline font-extrabold text-xl uppercase tracking-tight leading-tight flex items-center gap-2 flex-wrap">
                          <span className="truncate max-w-[200px]">{tx.merchant}</span>
                          {isOptimistic && (
                            <span className="text-[9px] font-black tracking-wider text-white bg-black px-2 py-0.5 uppercase pulse-sync shrink-0">
                              Syncing
                            </span>
                          )}
                        </h3>
                        <p className="text-on-surface-variant font-medium text-xs mt-0.5">
                          {formatTxDate(tx.createdAt)} · {meta.label}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`font-headline font-black text-2xl leading-tight ${isInc ? 'text-primary-dim' : 'text-error'
                          }`}
                      >
                        {isInc ? '+' : '−'}{formatMoney(tx.amount, currency)}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60 mt-0.5">
                        {isInc ? 'Income' : meta.label}
                      </p>
                    </div>
                  </div>

                  {/* AI Tags */}
                  {tags.length > 0 && (
                    <div className="mt-4 flex gap-2 flex-wrap items-center">
                      <span
                        className="material-symbols-outlined text-sm text-on-surface-variant opacity-50 leading-none"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        auto_awesome
                      </span>
                      {tags.map((tag, j) => (
                        <span
                          key={tag}
                          className={`${TAG_COLORS[j % TAG_COLORS.length]} border border-inverse-surface px-2.5 py-1 text-[10px] font-black uppercase tracking-wide`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* AI Insight */}
                  {tx.aiInsight && (
                    <div className="mt-4 bg-white border-2 border-inverse-surface p-4">
                      <p className="font-headline font-black uppercase text-[10px] tracking-[0.18em] mb-1 flex items-center gap-1.5">
                        <span
                          className="material-symbols-outlined text-xs leading-none"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          psychology
                        </span>
                        AI Insight
                      </p>
                      <p className="font-bold text-sm leading-snug">{tx.aiInsight}</p>
                    </div>
                  )}

                  {/* Note */}
                  {tx.note && (
                    <p className="mt-3 text-sm font-bold text-on-surface-variant italic">
                      "{tx.note}"
                    </p>
                  )}

                  {/* Delete */}
                  <div className="mt-4 flex justify-end">
                    <button
                      disabled={isOptimistic}
                      onClick={() =>
                        deleteTx.mutate(tx.id, {
                          onSuccess: () => showToast('Transaction deleted.', 'info'),
                        })
                      }
                      className={[
                        'text-xs font-bold uppercase transition-colors flex items-center gap-1',
                        isOptimistic
                          ? 'text-on-surface-variant/40 cursor-not-allowed'
                          : 'text-on-surface-variant hover:text-error cursor-pointer',
                      ].join(' ')}
                    >
                      <span className="material-symbols-outlined text-sm leading-none">
                        delete
                      </span>
                      {isOptimistic ? 'Syncing...' : 'Delete'}
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Refresh button — replaces the old conflicting FAB ───────────── */}
      {!isLoading && transactions.length > 0 && (
        <motion.div variants={itemVariants} className="mt-8">
          <button
            onClick={() => {
              refetch();
              showToast('Feed refreshed.', 'success');
            }}
            className="w-full border-4 border-inverse-surface py-3 font-headline font-black uppercase text-sm hard-shadow hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all bg-white cursor-pointer flex items-center justify-center gap-2"
          >
            <span
              className="material-symbols-outlined text-lg leading-none"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              refresh
            </span>
            Refresh Feed
          </button>
        </motion.div>
      )}
    </motion.main>
  );
}