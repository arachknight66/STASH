'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/app';
import { useTransactions } from '@/hooks/useStash';
import { formatMoney } from '@/lib/currencies';
import { CATEGORY_META } from '@/lib/constants';
import TransactionDetailDrawer, {
  type DrawerTransaction,
} from '@/components/ui/TransactionDetailDrawer';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ────────────────────────────────────────────────────────────────

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

const TX_TYPES = [
  { value: 'EXPENSE', label: 'Expenses' },
  { value: 'INCOME', label: 'Income' },
  { value: 'TRANSFER', label: 'Transfers' },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTxDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Convert YYYY-MM-DD from a date input to ISO datetime string
function dateInputToISO(dateStr: string, endOfDay = false): string {
  const time = endOfDay ? 'T23:59:59' : 'T00:00:00';
  return new Date(`${dateStr}${time}`).toISOString();
}

// Format a date for display in a filter chip
function formatChipDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Skeleton card
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
      <div className="flex gap-2">
        <div className="h-6 w-20 bg-surface-container" />
        <div className="h-6 w-24 bg-surface-container" />
      </div>
      <div className="h-14 bg-surface-container" />
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      className="inline-flex items-center gap-1.5 bg-primary-container border-2 border-inverse-surface px-2.5 py-1 font-headline font-black text-[10px] uppercase tracking-wide whitespace-nowrap"
    >
      {label}
      <button
        onClick={onRemove}
        className="material-symbols-outlined text-xs leading-none hover:text-error transition-colors cursor-pointer"
        aria-label={`Remove ${label} filter`}
      >
        close
      </button>
    </motion.span>
  );
}

// ─── FeedPage ─────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const currency = useAppStore((s) => s.currency);
  const showToast = useAppStore((s) => s.showToast);

  // ── Filter state ──────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [activeType, setActiveType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  // ── Other state ───────────────────────────────────────────────────────
  const [selectedTx, setSelectedTx] = useState<DrawerTransaction | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto-focus search on open
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [searchOpen]);

  // ── Build API params (server-side filters) ────────────────────────────
  const apiParams = useMemo(() => {
    const p: Record<string, string> = { limit: '100' }; // fetch more to allow client filtering
    if (activeCategory) p.category = activeCategory;
    if (activeType) p.type = activeType;
    if (dateFrom) p.from = dateInputToISO(dateFrom, false);
    if (dateTo) p.to = dateInputToISO(dateTo, true);
    return p;
  }, [activeCategory, activeType, dateFrom, dateTo]);

  const { data, isLoading, refetch } = useTransactions(apiParams);

  // ── Client-side filtering (search + amount range) ────────────────────
  const allItems = data?.items ?? [];
  const transactions = useMemo(() => {
    let items = allItems;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter((tx) =>
        tx.merchant.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        (tx.note ?? '').toLowerCase().includes(q),
      );
    }

    if (amountMin) {
      const min = parseFloat(amountMin);
      if (Number.isFinite(min)) items = items.filter((tx) => tx.amount >= min);
    }
    if (amountMax) {
      const max = parseFloat(amountMax);
      if (Number.isFinite(max)) items = items.filter((tx) => tx.amount <= max);
    }

    return items;
  }, [allItems, searchQuery, amountMin, amountMax]);

  const total = transactions.length;

  // ── Active filter count ───────────────────────────────────────────────
  const activeFilterCount = [
    activeCategory, activeType, dateFrom, dateTo,
    amountMin, amountMax, searchQuery.trim(),
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  function clearAllFilters() {
    setSearchQuery('');
    setActiveCategory('');
    setActiveType('');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setSearchOpen(false);
    setFilterOpen(false);
  }

  // ── Open drawer ────────────────────────────────────────────────────────
  function openDrawer(tx: any) {
    setSelectedTx({
      id: tx.id,
      merchant: tx.merchant,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      note: tx.note,
      aiInsight: tx.aiInsight,
      tags: tx.tags ?? [],
      createdAt: tx.createdAt,
      occurredAt: tx.occurredAt,
      source: tx.source ?? 'MANUAL',
      status: tx.status ?? 'POSTED',
      accountId: tx.accountId,
      account: tx.account,
      isOptimistic: tx.isOptimistic,
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-3xl mx-auto px-4 pt-8 pb-8"
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <motion.div
          variants={itemVariants}
          className="mb-6 flex justify-between items-start gap-4 flex-wrap"
        >
          <div>
            <h1 className="font-headline font-black text-6xl tracking-tighter uppercase leading-none">
              SMART FEED
            </h1>
            <p className="font-bold text-on-surface-variant uppercase tracking-[0.18em] text-xs mt-2">
              {isLoading
                ? 'Loading...'
                : `${total} transaction${total !== 1 ? 's' : ''}${hasActiveFilters ? ' — filtered' : ''}`}
            </p>
          </div>

          {/* Search + filter controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search bar — expands on tap */}
            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                {searchOpen ? (
                  <motion.div
                    key="search-input"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 200, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    className="overflow-hidden"
                  >
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search merchants…"
                      className="w-full border-2 border-inverse-surface px-3 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-secondary bg-white dark:bg-[#1d252b] dark:text-white"
                      aria-label="Search transactions"
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <button
                onClick={() => {
                  if (searchOpen && searchQuery) setSearchQuery('');
                  setSearchOpen((p) => !p);
                }}
                className={[
                  'w-10 h-10 border-2 border-inverse-surface flex items-center justify-center transition-colors cursor-pointer',
                  searchOpen ? 'bg-primary-container' : 'bg-white hover:bg-surface-container',
                ].join(' ')}
                aria-label={searchOpen ? 'Close search' : 'Search transactions'}
              >
                <span className="material-symbols-outlined text-xl leading-none">
                  {searchOpen ? 'close' : 'search'}
                </span>
              </button>
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setFilterOpen((p) => !p)}
              className={[
                'relative w-10 h-10 border-2 border-inverse-surface flex items-center justify-center transition-colors cursor-pointer',
                filterOpen || activeFilterCount > 0
                  ? 'bg-primary-container'
                  : 'bg-white hover:bg-surface-container',
              ].join(' ')}
              aria-label="Toggle filters"
              aria-expanded={filterOpen}
            >
              <span className="material-symbols-outlined text-xl leading-none">tune</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-secondary text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </motion.div>

        {/* ── Filter panel ────────────────────────────────────────────── */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              key="filter-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="overflow-hidden mb-4"
            >
              <div className="bg-white border-4 border-inverse-surface p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <p className="font-headline font-black text-sm uppercase tracking-wider">
                    Filters
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="text-[10px] font-black uppercase text-error hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Transaction type */}
                <div>
                  <p className="font-headline font-black text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
                    Type
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {TX_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setActiveType((p) => p === t.value ? '' : t.value)}
                        className={[
                          'border-2 border-inverse-surface px-3 py-1.5 font-headline font-black text-xs uppercase transition-colors cursor-pointer',
                          activeType === t.value
                            ? 'bg-primary-container'
                            : 'bg-surface-container hover:bg-surface-container-high',
                        ].join(' ')}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date range */}
                <div>
                  <p className="font-headline font-black text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
                    Date Range
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">
                        From
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full border-2 border-inverse-surface px-3 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-secondary bg-white dark:bg-[#1d252b] dark:text-white cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">
                        To
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full border-2 border-inverse-surface px-3 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-secondary bg-white dark:bg-[#1d252b] dark:text-white cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Amount range */}
                <div>
                  <p className="font-headline font-black text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
                    Amount Range ({currency})
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">
                        Min
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={amountMin}
                        onChange={(e) => setAmountMin(e.target.value)}
                        placeholder="0.00"
                        className="w-full border-2 border-inverse-surface px-3 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-secondary bg-white dark:bg-[#1d252b] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">
                        Max
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={amountMax}
                        onChange={(e) => setAmountMax(e.target.value)}
                        placeholder="Any"
                        className="w-full border-2 border-inverse-surface px-3 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-secondary bg-white dark:bg-[#1d252b] dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Active filter chips ──────────────────────────────────────── */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div
              key="chips"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 mb-4 overflow-hidden"
            >
              {searchQuery.trim() && (
                <FilterChip
                  label={`"${searchQuery.trim()}"`}
                  onRemove={() => setSearchQuery('')}
                />
              )}
              {activeCategory && (
                <FilterChip
                  label={`${CATEGORY_META[activeCategory]?.emoji} ${activeCategory}`}
                  onRemove={() => setActiveCategory('')}
                />
              )}
              {activeType && (
                <FilterChip
                  label={TX_TYPES.find((t) => t.value === activeType)?.label ?? activeType}
                  onRemove={() => setActiveType('')}
                />
              )}
              {dateFrom && (
                <FilterChip
                  label={`From ${formatChipDate(dateFrom)}`}
                  onRemove={() => setDateFrom('')}
                />
              )}
              {dateTo && (
                <FilterChip
                  label={`To ${formatChipDate(dateTo)}`}
                  onRemove={() => setDateTo('')}
                />
              )}
              {amountMin && (
                <FilterChip
                  label={`Min ${amountMin}`}
                  onRemove={() => setAmountMin('')}
                />
              )}
              {amountMax && (
                <FilterChip
                  label={`Max ${amountMax}`}
                  onRemove={() => setAmountMax('')}
                />
              )}
              <button
                onClick={clearAllFilters}
                className="text-[10px] font-black uppercase text-on-surface-variant hover:text-error transition-colors cursor-pointer underline self-center"
              >
                Clear all
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Category filters ─────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveCategory('')}
            className={[
              'border-2 border-inverse-surface px-3 py-1.5 font-headline font-black text-xs uppercase transition-colors cursor-pointer',
              !activeCategory ? 'bg-primary-container' : 'bg-white hover:bg-surface-container',
            ].join(' ')}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory((p) => p === cat ? '' : cat)}
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
        </motion.div>

        {/* ── Skeleton loaders ─────────────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-6">
            {[0, 1, 2].map((i) => <TransactionSkeleton key={i} />)}
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {!isLoading && transactions.length === 0 && (
          <motion.div
            variants={itemVariants}
            className="bg-white border-4 border-inverse-surface p-12 text-center"
          >
            <p className="text-4xl mb-3">{hasActiveFilters ? '🔍' : '📭'}</p>
            <p className="font-headline font-black text-2xl uppercase mb-2">
              {hasActiveFilters ? 'No matches' : 'Nothing here yet.'}
            </p>
            <p className="text-on-surface-variant font-bold text-sm mb-4">
              {hasActiveFilters
                ? 'Try adjusting your filters or search query.'
                : 'Log a transaction from the dashboard to get started.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="border-2 border-inverse-surface px-5 py-2 font-headline font-black text-xs uppercase hover:bg-surface-container transition-colors cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </motion.div>
        )}

        {/* ── Transaction feed ─────────────────────────────────────────── */}
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
                    onClick={() => !isOptimistic && openDrawer(tx)}
                    className={[
                      'interactive-lift border-4 border-inverse-surface p-6 hard-shadow',
                      cardBg,
                      isOptimistic
                        ? 'pulse-sync opacity-60 border-dashed bg-surface-container cursor-not-allowed'
                        : 'cursor-pointer',
                    ].join(' ')}
                  >
                    {/* Top row */}
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
                        <p className={`font-headline font-black text-2xl leading-tight ${isInc ? 'text-primary-dim' : 'text-error'}`}>
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

                    {/* Tap hint */}
                    {!isOptimistic && (
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-wider">
                          Tap for details
                        </p>
                        <span className="material-symbols-outlined text-sm text-on-surface-variant opacity-30 leading-none">
                          open_in_full
                        </span>
                      </div>
                    )}
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Refresh button ───────────────────────────────────────────── */}
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

      {/* Transaction detail drawer */}
      <TransactionDetailDrawer
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onDeleted={() => refetch()}
      />
    </>
  );
}