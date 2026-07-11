'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/app';
import {
  useStats,
  useTransactions,
  useCreateTransaction,
  useBudgets,
  useBuckets,
  useBoostBucket,
  useAccounts,
  type EnrichedBudget,
} from '@/hooks/useStash';
import { formatMoney, formatCompactMoney, displayToUsd } from '@/lib/currencies';
import { CATEGORY_META } from '@/lib/constants';
import ActionModal from '@/components/ui/ActionModal';
import TransactionDetailDrawer, {
  type DrawerTransaction,
} from '@/components/ui/TransactionDetailDrawer';
import { motion, AnimatePresence } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp';

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
} as const;

// ─── Constants ────────────────────────────────────────────────────────────────

type ModalConfig = React.ComponentProps<typeof ActionModal>['config'];

const CATEGORY_COLORS: Record<string, string> = {
  FOOD: 'bg-secondary-container',
  DRIP: 'bg-primary-container',
  ENTERTAINMENT: 'bg-tertiary-container',
  TRANSPORT: 'bg-surface-container',
  BILLS: 'bg-surface-container',
  COFFEE: 'bg-primary-container',
  SAVINGS: 'bg-primary-container',
  INCOME: 'bg-primary-container',
  OTHER: 'bg-surface-container',
};

const RECEIPT_ICON_COLORS: Record<string, string> = {
  FOOD: 'bg-tertiary text-white',
  DRIP: 'bg-secondary text-white',
  ENTERTAINMENT: 'bg-primary text-on-primary',
  TRANSPORT: 'bg-surface-variant text-on-surface',
  BILLS: 'bg-surface-variant text-on-surface',
  COFFEE: 'bg-tertiary text-white',
  SAVINGS: 'bg-primary text-on-primary',
  INCOME: 'bg-primary text-on-primary',
  OTHER: 'bg-surface-variant text-on-surface',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTxDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getMonthYear(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function savingsBarColor(pct: number): string {
  if (pct <= 0) return 'bg-error';
  if (pct < 20) return 'bg-[#ff8800]';
  return 'bg-[#cafd00]';
}

// Group receipts by TODAY / YESTERDAY / date label
function groupByDate(items: any[]): { label: string; items: any[] }[] {
  const now = new Date();
  const todayStr = now.toDateString();
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const yestStr = yest.toDateString();

  const groups: Record<string, any[]> = {};
  for (const tx of items) {
    const ds = new Date(tx.createdAt).toDateString();
    const label =
      ds === todayStr ? 'Today'
        : ds === yestStr ? 'Yesterday'
          : formatTxDate(tx.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(tx);
  }
  const ORDER = ['Today', 'Yesterday'];
  const sorted = [
    ...ORDER.filter((l) => groups[l]),
    ...Object.keys(groups).filter((l) => !ORDER.includes(l)),
  ];
  return sorted.map((label) => ({ label, items: groups[label] }));
}

// ─── Skeleton components ──────────────────────────────────────────────────────

function StatTileSkeleton() {
  return (
    <div className="h-20 bg-surface-container border-2 border-inverse-surface animate-pulse shrink-0 min-w-[130px]" />
  );
}

function ReceiptSkeleton() {
  return (
    <div className="bg-white border-2 border-inverse-surface p-4 flex items-center justify-between gap-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-surface-container border-2 border-inverse-surface" />
        <div className="space-y-2">
          <div className="h-4 w-28 bg-surface-container" />
          <div className="h-3 w-20 bg-surface-container" />
        </div>
      </div>
      <div className="h-5 w-16 bg-surface-container" />
    </div>
  );
}

function ChecklistItem({ isDone, label, onClick }: { isDone: boolean; label: string; onClick: () => void }) {
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    if (isDone) {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
    }
  }, [isDone]);

  return (
    <AnimatePresence>
      {shouldRender && (
        <motion.div
          initial={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0, padding: 0, marginTop: 0, marginBottom: 0, borderWidth: 0, overflow: 'hidden', transition: { duration: 0.3 } }}
          onClick={onClick}
          className="flex items-center gap-3 p-3 bg-surface-container border-2 border-inverse-surface cursor-pointer interactive-lift select-none"
        >
          <div className={`w-6 h-6 border-2 border-inverse-surface flex items-center justify-center shrink-0 transition-colors ${isDone ? 'bg-[#cafd00]' : 'bg-white dark:bg-[#1d252b]'}`}>
            {isDone && <span className="material-symbols-outlined text-inverse-surface font-black text-lg">check</span>}
          </div>
          <span className={`font-headline font-bold text-xs uppercase ${isDone ? 'line-through opacity-50' : ''}`}>{label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── DashPage ─────────────────────────────────────────────────────────────────

export default function DashPage() {
  const currency = useAppStore((s) => s.currency);
  const navigate = useAppStore((s) => s.navigate);
  const showToast = useAppStore((s) => s.showToast);
  const pendingFabAction = useAppStore((s) => s.pendingFabAction);
  const clearPendingFabAction = useAppStore((s) => s.clearPendingFabAction);

  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: txData } = useTransactions({ limit: '5' });
  const { data: buckets = [] } = useBuckets();
  const { data: budgets = [] } = useBudgets();
  const { data: accounts = [] } = useAccounts();

  const createTx = useCreateTransaction();
  const boostBucket = useBoostBucket();

  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [selectedTx, setSelectedTx] = useState<DrawerTransaction | null>(null);

  const recentTx = txData?.items ?? [];

  const isTxDone = (txData?.total ?? 0) > 0 || recentTx.length > 0;
  const isBudgetDone = budgets.length > 0;
  const isBucketDone = buckets.length > 0;
  const isAccountDone = accounts.length > 0;
  const allCompleted = isTxDone && isBudgetDone && isBucketDone && isAccountDone;

  const [checklistDismissed, setChecklistDismissed] = useState(true);
  useEffect(() => {
    const dismissed = localStorage.getItem('stash-checklist-dismissed') === 'true';
    setChecklistDismissed(dismissed);
  }, []);

  const handleDismissChecklist = () => {
    localStorage.setItem('stash-checklist-dismissed', 'true');
    setChecklistDismissed(true);
  };

  // Budget lookup map for Heat Map
  const budgetByCategory = useMemo(() => {
    const map: Record<string, EnrichedBudget> = {};
    budgets.forEach((b) => {
      if (b.scope === 'CATEGORY' && b.category) map[b.category] = b;
    });
    return map;
  }, [budgets]);

  // ── Derived stats ──────────────────────────────────────────────────────
  const liquidity = stats?.liquidity ?? 0;
  const monthlySpend = stats?.monthlySpend ?? 0;
  const monthlyIncome = stats?.monthlyIncome ?? 0;
  const dailyBurn = stats?.dailyBurn ?? 0;
  const runway = stats?.runway ?? 0;
  const netWorth = stats?.netWorth ?? 0;
  const categoryBreakdown = stats?.categoryBreakdown ?? {};

  const savingsRate = monthlyIncome > 0
    ? Math.max(0, Math.min(100, Math.round(((monthlyIncome - monthlySpend) / monthlyIncome) * 100)))
    : 0;

  const topCategories = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const txGroups = useMemo(() => groupByDate(recentTx), [recentTx]);
  const bucketList = buckets.slice(0, 4);

  // ── Count-up animated display values ──────────────────────────────
  // Only animate once stats have loaded — enabled: !statsLoading prevents
  // animating from 0 to 0 then 0 to real value (which would look broken)
  const liquidityDisplay = useCountUp({
    to: liquidity,
    duration: 1000,
    delay: 150,
    enabled: !statsLoading,
    format: (n) => formatMoney(n, currency),
  });
  const dailyBurnDisplay = useCountUp({
    to: dailyBurn,
    duration: 800,
    enabled: !statsLoading,
    format: (n) => formatCompactMoney(n, currency),
  });
  const netWorthDisplay = useCountUp({
    to: netWorth,
    duration: 800,
    delay: 60,
    enabled: !statsLoading,
    format: (n) => formatCompactMoney(n, currency),
  });

  // ── FAB action listener ────────────────────────────────────────────────
  useEffect(() => {
    if (!pendingFabAction) return;
    if (pendingFabAction === 'quick_spend') { openQuickSpend(); clearPendingFabAction(); }
    else if (pendingFabAction === 'load_up') { openLoadUp(); clearPendingFabAction(); }
    else if (pendingFabAction === 'boost') { openBoost(); clearPendingFabAction(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFabAction]);

  // ── Modals ─────────────────────────────────────────────────────────────

  function openQuickSpend() {
    setModal({
      title: 'Quick Spend', subtitle: 'Log a fast transaction.', submitLabel: 'Log It',
      fields: [
        { name: 'merchant', label: 'Merchant', type: 'text', placeholder: 'TACO HEAVEN', required: true },
        { name: 'amount', label: `Amount (${currency})`, type: 'number', step: '0.01', min: '0.01', placeholder: '0.00', required: true, inputmode: 'decimal' },
        {
          name: 'category', label: 'Category', type: 'select',
          options: Object.entries(CATEGORY_META).filter(([k]) => k !== 'INCOME').map(([k, v]) => ({ value: k, label: `${v.emoji} ${v.label}` }))
        },
      ],
      onSubmit: (values) => {
        const d = Number(values.amount);
        if (!Number.isFinite(d) || d <= 0) { showToast('Enter a valid amount.', 'error'); return false; }
        const amount = displayToUsd(d, currency);
        createTx.mutate(
          { merchant: values.merchant.trim().toUpperCase(), amount, type: 'EXPENSE', category: (values.category ?? 'OTHER') as never, tags: [] },
          { onSuccess: () => showToast(`Logged ${formatMoney(amount, currency)} ✓`, 'success') },
        );
        return true;
      },
    });
  }

  function openLoadUp() {
    setModal({
      title: 'Load Up', subtitle: 'Add funds to your stash.', submitLabel: 'Load Up',
      fields: [
        { name: 'merchant', label: 'Source', type: 'text', placeholder: 'PAYCHECK', required: true },
        { name: 'amount', label: `Amount (${currency})`, type: 'number', step: '0.01', min: '0.01', value: '250.00', placeholder: '0.00', required: true, inputmode: 'decimal' },
      ],
      onSubmit: (values) => {
        const d = Number(values.amount);
        if (!Number.isFinite(d) || d <= 0) { showToast('Enter a valid amount.', 'error'); return false; }
        const amount = displayToUsd(d, currency);
        createTx.mutate(
          { merchant: values.merchant.trim().toUpperCase() || 'MANUAL DEPOSIT', amount, type: 'INCOME', category: 'INCOME', tags: [] },
          { onSuccess: () => showToast(`Loaded ${formatMoney(amount, currency)} ✓`, 'success') },
        );
        return true;
      },
    });
  }

  function openBoost() {
    const lowest = [...buckets].sort((a, b) => (a.savedUsd / a.targetUsd) - (b.savedUsd / b.targetUsd))[0];
    if (!lowest) { showToast('Create a bucket first.', 'info'); navigate('buckets'); return; }
    setModal({
      title: 'Quick Boost', subtitle: `Auto-targeting "${lowest.name}".`, submitLabel: 'Boost',
      fields: [{ name: 'amountUsd', label: `Amount (${currency})`, type: 'number', step: '0.01', min: '0.01', value: '25', required: true }],
      onSubmit: (v) => {
        const d = Number(v.amountUsd);
        if (!Number.isFinite(d) || d <= 0) { showToast('Enter a valid amount.', 'error'); return false; }
        const amt = displayToUsd(d, currency);
        boostBucket.mutate({ id: lowest.id, amountUsd: amt }, { onSuccess: () => showToast(`Boosted ${lowest.name}! ⚡`, 'success') });
        return true;
      },
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-4xl mx-auto pb-8"
      >

        {/* ── 1. HERO ─────────────────────────────────────────────────── */}
        <motion.section
          variants={itemVariants}
          className="bg-inverse-surface text-white px-6 pt-7 pb-0 relative overflow-hidden"
        >
          {/* Eyebrow */}
          <div className="flex justify-between items-center mb-3">
            <p className="font-headline font-black text-[10px] uppercase tracking-[0.3em] opacity-40">
              This Month
            </p>
            <p className="font-headline font-bold text-[10px] uppercase tracking-wider opacity-40">
              {getMonthYear()}
            </p>
          </div>

          {/* THE NUMBER — count-up animated */}
          <div className="mb-2">
            {statsLoading
              ? <div className="h-16 w-56 bg-white/10 animate-pulse" />
              : (
                <motion.p
                  className="font-headline font-black text-6xl sm:text-7xl leading-none tracking-tighter tabular-nums"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  {liquidityDisplay}
                </motion.p>
              )}
            <p className="font-bold text-xs opacity-40 uppercase tracking-widest mt-1.5">
              Total liquidity
            </p>
          </div>

          {/* THE SIGNATURE: savings rate battery bar */}
          <div className="mt-5">
            <div className="flex justify-between items-center mb-2">
              <p className="font-headline font-black text-[10px] uppercase tracking-widest opacity-60">
                Monthly savings rate
              </p>
              <p className="font-headline font-black text-sm">
                {statsLoading ? '—' : `${savingsRate}%`}
              </p>
            </div>
            {/* Full-bleed bar */}
            <div className="h-3 bg-white/10 -mx-6 relative overflow-hidden">
              {!statsLoading && (
                <motion.div
                  className={`h-full ${savingsBarColor(savingsRate)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${savingsRate}%` }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                />
              )}
            </div>
            <p className="font-bold text-[10px] opacity-40 mt-2 mb-5">
              {statsLoading
                ? '…'
                : runway > 365
                  ? 'Runway: 1 year+ at this pace'
                  : `Runway: ${runway} days at current burn`}
            </p>
          </div>

          {/* Spend vs income strip */}
          <div className="flex gap-0 -mx-6 border-t border-white/10">
            <div className="flex-1 px-6 py-4 border-r border-white/10">
              <p className="font-headline font-black text-[9px] uppercase tracking-widest opacity-50 mb-1">↓ Spent</p>
              {statsLoading
                ? <div className="h-5 w-20 bg-white/10 animate-pulse" />
                : <p className="font-headline font-black text-lg leading-none text-error">
                  {formatCompactMoney(monthlySpend, currency)}
                </p>}
            </div>
            <div className="flex-1 px-6 py-4">
              <p className="font-headline font-black text-[9px] uppercase tracking-widest opacity-50 mb-1">↑ Earned</p>
              {statsLoading
                ? <div className="h-5 w-20 bg-white/10 animate-pulse" />
                : <p className="font-headline font-black text-lg leading-none text-[#cafd00]">
                  {formatCompactMoney(monthlyIncome, currency)}
                </p>}
            </div>
          </div>

          {/* Decorative bg */}
          <div className="absolute right-[-24px] top-[-16px] opacity-[0.03] pointer-events-none rotate-12 select-none">
            <span className="font-headline font-black text-[180px] leading-none">$</span>
          </div>
        </motion.section>

        {/* Setup Checklist */}
        <AnimatePresence>
          {!allCompleted && !checklistDismissed && (
            <motion.section
              variants={itemVariants}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 pt-5"
            >
              <div className="bg-white dark:bg-[#161d22] border-4 border-inverse-surface hard-shadow p-5 relative">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-headline font-black text-sm uppercase tracking-wider text-inverse-surface dark:text-white">LOCKED IN: GETTING STARTED</h3>
                  <button
                    onClick={handleDismissChecklist}
                    className="cursor-pointer text-inverse-surface dark:text-white hover:text-error transition-colors flex items-center justify-center"
                    aria-label="Dismiss checklist"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
                <div className="space-y-2.5">
                  <ChecklistItem
                    isDone={isTxDone}
                    label="Log your first transaction"
                    onClick={openQuickSpend}
                  />
                  <ChecklistItem
                    isDone={isBudgetDone}
                    label="Set a budget"
                    onClick={() => navigate('budgets')}
                  />
                  <ChecklistItem
                    isDone={isBucketDone}
                    label="Create a savings bucket"
                    onClick={() => navigate('buckets')}
                  />
                  <ChecklistItem
                    isDone={isAccountDone}
                    label="Add an account"
                    onClick={() => navigate('vault')}
                  />
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── 2. QUICK STAT TILES ─────────────────────────────────────── */}
        <motion.section variants={itemVariants} className="px-6 pt-5">
          <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
            {statsLoading
              ? [0, 1, 2].map((i) => <StatTileSkeleton key={i} />)
              : [
                { label: 'Daily Burn', value: dailyBurnDisplay, sub: 'avg per day', bg: 'bg-white' },
                { label: 'Runway', value: runway > 365 ? '1yr+' : `${runway}d`, sub: 'at current pace', bg: runway < 30 ? 'bg-error-container' : runway < 90 ? 'bg-[#fff3cd]' : 'bg-primary-container' },
                { label: 'Net Worth', value: netWorthDisplay, sub: 'liquidity + savings', bg: 'bg-tertiary-container' },
              ].map(({ label, value, sub, bg }) => (
                <div key={label} className={`${bg} border-4 border-inverse-surface hard-shadow p-4 shrink-0 min-w-[130px] snap-start`}>
                  <p className="font-headline font-black text-[9px] uppercase tracking-widest opacity-60 mb-1">{label}</p>
                  <p className="font-headline font-black text-2xl leading-none tabular-nums">{value}</p>
                  <p className="font-bold text-[10px] text-on-surface-variant opacity-70 mt-1">{sub}</p>
                </div>
              ))}
          </div>
        </motion.section>

        {/* ── 3. QUICK ACTIONS ────────────────────────────────────────── */}
        <motion.section variants={itemVariants} className="px-6 pt-5 flex gap-3">
          <button
            onClick={openQuickSpend}
            className="flex-1 interactive-lift bg-secondary-container border-4 border-inverse-surface py-4 hard-shadow flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            <span className="font-headline font-black text-sm uppercase">Quick Spend</span>
          </button>
          <button
            onClick={openLoadUp}
            className="flex-1 interactive-lift bg-white border-4 border-inverse-surface py-4 hard-shadow flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>add_card</span>
            <span className="font-headline font-black text-sm uppercase">Load Up</span>
          </button>
        </motion.section>

        {/* ── 4. HEAT MAP ─────────────────────────────────────────────── */}
        <motion.section variants={itemVariants} className="px-6 pt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-headline font-black text-xs uppercase tracking-[0.22em] text-on-surface-variant">
              Spending Heat Map
            </h2>
            <div className="flex items-center gap-3">
              <span className="font-bold text-[10px] uppercase tracking-wider text-on-surface-variant opacity-60">Last 30 days</span>
              <button onClick={() => navigate('budgets')} className="font-headline font-black text-[10px] uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors cursor-pointer underline">
                Budgets
              </button>
            </div>
          </div>

          {topCategories.length === 0 && !statsLoading ? (
            <div className="border-4 border-dashed border-inverse-surface p-8 text-center">
              <p className="font-bold text-on-surface-variant text-sm">Log some transactions to see your spending breakdown.</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory sm:grid sm:grid-cols-4 sm:overflow-visible">
              {statsLoading
                ? [0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-28 min-w-[120px] bg-surface-container border-2 border-inverse-surface animate-pulse shrink-0 snap-start" />
                ))
                : topCategories.map(([cat, amt]) => {
                  const meta = CATEGORY_META[cat] ?? CATEGORY_META.OTHER;
                  const budget = budgetByCategory[cat];
                  const budgetPct = budget ? Math.min(Math.round((amt / budget.amount) * 100), 100) : null;
                  const isOver = budget ? amt > budget.amount : false;
                  const isWarn = budget ? (budgetPct ?? 0) >= budget.alertThresholdPct && !isOver : false;
                  const barColor = isOver ? 'bg-error' : isWarn ? 'bg-[#ff8800]' : 'bg-primary';
                  return (
                    <button
                      key={cat}
                      onClick={() => navigate('budgets')}
                      className={`${CATEGORY_COLORS[cat] ?? 'bg-surface-container'} border-2 border-inverse-surface p-4 interactive-soft cursor-pointer text-left shrink-0 min-w-[120px] snap-start sm:min-w-0 w-full`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-2xl">{meta.emoji}</span>
                        {isOver && <span className="text-[8px] font-black uppercase text-error bg-white px-1 py-0.5 border border-error leading-none">Over</span>}
                        {isWarn && !isOver && <span className="text-[8px] font-black uppercase text-[#7d4e00] bg-white px-1 py-0.5 border border-[#ff8800] leading-none">Warn</span>}
                      </div>
                      <p className="font-headline font-black text-xs uppercase truncate">{meta.label}</p>
                      <p className="text-xs font-bold opacity-70 mt-0.5">
                        {formatCompactMoney(amt, currency)}
                        {budget && <span className="opacity-50"> / {formatCompactMoney(budget.amount, currency)}</span>}
                      </p>
                      {budgetPct !== null && (
                        <div className="w-full h-1 bg-black/10 mt-2 overflow-hidden">
                          <motion.div className={`h-full ${barColor}`} initial={{ width: 0 }} animate={{ width: `${budgetPct}%` }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }} />
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          )}
        </motion.section>

        {/* ── 5. SAVINGS PREVIEW ──────────────────────────────────────── */}
        {bucketList.length > 0 && (
          <motion.section variants={itemVariants} className="px-6 pt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-headline font-black text-xs uppercase tracking-[0.22em] text-on-surface-variant">Savings Buckets</h2>
              <button onClick={() => navigate('buckets')} className="font-headline font-black text-[10px] uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors cursor-pointer underline">
                All buckets
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
              {bucketList.map((b, i) => {
                const pct = Math.round((b.savedUsd / b.targetUsd) * 100);
                const FILLS = ['bg-[#cafd00]', 'bg-[#ffbdf3]', 'bg-[#bba2ff]', 'bg-white/60'];
                return (
                  <button key={b.id} onClick={() => navigate('buckets')}
                    className={`bg-inverse-surface text-white border-4 border-inverse-surface hard-shadow p-4 shrink-0 snap-start cursor-pointer text-left interactive-lift ${b.isFeatured ? 'min-w-[200px]' : 'min-w-[160px]'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="material-symbols-outlined text-2xl opacity-80" style={{ fontVariationSettings: "'FILL' 1" }}>{b.icon}</span>
                      <span className="font-headline font-black text-lg">{pct}%</span>
                    </div>
                    <p className="font-headline font-black text-sm uppercase truncate mb-2">{b.name}</p>
                    <div className="w-full h-2 bg-white/10 overflow-hidden">
                      <motion.div className={`${FILLS[i % FILLS.length]} h-full`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.05 }} />
                    </div>
                    <p className="font-bold text-[10px] opacity-50 mt-1.5">
                      {formatCompactMoney(b.savedUsd, currency)} of {formatCompactMoney(b.targetUsd, currency)}
                    </p>
                  </button>
                );
              })}
              <button onClick={() => navigate('buckets')}
                className="bg-surface-container border-4 border-dashed border-inverse-surface p-4 shrink-0 min-w-[120px] snap-start cursor-pointer flex flex-col items-center justify-center gap-2 opacity-50 hover:opacity-100 transition-opacity"
              >
                <span className="material-symbols-outlined text-3xl">add_circle</span>
                <span className="font-headline font-black text-xs uppercase">New</span>
              </button>
            </div>
          </motion.section>
        )}

        {/* ── 6. RECENT RECEIPTS — date-grouped ───────────────────────── */}
        <motion.section variants={itemVariants} className="px-6 pt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-headline font-black text-xs uppercase tracking-[0.22em] text-on-surface-variant">Recent Receipts</h2>
            <button onClick={() => navigate('feed')} className="font-headline font-black text-[10px] uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors cursor-pointer underline">
              View all
            </button>
          </div>

          {statsLoading && recentTx.length === 0 ? (
            <div className="space-y-2.5">{[0, 1, 2].map((i) => <ReceiptSkeleton key={i} />)}</div>
          ) : recentTx.length === 0 ? (
            <div className="bg-white border-2 border-inverse-surface p-8 text-center">
              <p className="font-headline font-black text-base uppercase mb-1">No transactions yet</p>
              <p className="font-bold text-on-surface-variant text-sm">Hit Quick Spend to log your first one.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {txGroups.map(({ label, items }) => (
                <div key={label}>
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-headline font-black text-[10px] uppercase tracking-widest text-on-surface-variant shrink-0">{label}</p>
                    <div className="flex-1 h-px bg-inverse-surface opacity-10" />
                  </div>
                  <div className="space-y-2">
                    {items.map((tx: any) => {
                      const meta = CATEGORY_META[tx.category] ?? CATEGORY_META.OTHER;
                      const isIncome = tx.type === 'INCOME';
                      const iconTheme = RECEIPT_ICON_COLORS[tx.category] ?? RECEIPT_ICON_COLORS.OTHER;
                      const isOpt = tx.isOptimistic;
                      return (
                        <motion.div
                          key={tx.id}
                          layout
                          onClick={() => !isOpt && setSelectedTx({
                            id: tx.id, merchant: tx.merchant, amount: tx.amount,
                            type: tx.type, category: tx.category, note: tx.note,
                            aiInsight: tx.aiInsight, tags: tx.tags ?? [],
                            createdAt: tx.createdAt, occurredAt: tx.occurredAt,
                            source: tx.source ?? 'MANUAL', status: tx.status ?? 'POSTED',
                            accountId: tx.accountId, account: tx.account, isOptimistic: isOpt,
                          })}
                          className={[
                            'bg-white border-2 border-inverse-surface hard-shadow p-4 flex items-center justify-between gap-3',
                            isOpt
                              ? 'pulse-sync opacity-60 border-dashed bg-surface-container cursor-not-allowed'
                              : 'hover:-translate-y-0.5 transition-transform cursor-pointer',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-11 h-11 shrink-0 ${iconTheme} border-2 border-inverse-surface flex items-center justify-center`}>
                              <span className="material-symbols-outlined text-base">{meta.icon}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-headline font-black text-base leading-tight truncate">{tx.merchant}</p>
                              <p className="text-[10px] font-bold opacity-50 uppercase tracking-wide">{meta.label}</p>
                            </div>
                          </div>
                          <p className={`font-headline font-black text-lg leading-tight shrink-0 ${isIncome ? 'text-primary-dim' : 'text-error'}`}>
                            {isIncome ? '+' : '−'}{formatMoney(tx.amount, currency)}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── 7. AI INTEL CTA — compact strip ─────────────────────────── */}
        <motion.section variants={itemVariants} className="px-6 pt-8">
          <button
            onClick={() => navigate('intel')}
            className="w-full bg-inverse-surface text-white border-4 border-inverse-surface p-5 hard-shadow flex items-center justify-between gap-4 hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 bg-[#cafd00] border-2 border-white/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-inverse-surface text-xl leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
              </div>
              <div className="min-w-0">
                <p className="font-headline font-black text-sm uppercase">
                  {stats?.topCategory
                    ? `Trim ${(CATEGORY_META[stats.topCategory] ?? CATEGORY_META.OTHER).label} 20% → save ${formatCompactMoney(stats.recoveryMove ?? 0, currency)}`
                    : 'Open Intel for AI spending insights'}
                </p>
                <p className="font-bold text-xs opacity-50 mt-0.5">AI Finance Coach</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-white opacity-40 group-hover:opacity-80 transition-opacity shrink-0">arrow_forward</span>
          </button>
        </motion.section>

      </motion.main>

      <ActionModal config={modal} onClose={() => setModal(null)} />
      <TransactionDetailDrawer transaction={selectedTx} onClose={() => setSelectedTx(null)} />
    </>
  );
}