'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app';
import { useStats, useTransactions, useCreateTransaction } from '@/hooks/useStash';
import { useBuckets, useBoostBucket } from '@/hooks/useStash';
import { formatMoney, formatCompactMoney, displayToUsd } from '@/lib/currencies';
import { CATEGORY_META } from '@/lib/constants';
import ActionModal from '@/components/ui/ActionModal';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 24 },
  },
} as const;

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

export default function DashPage() {
  const currency = useAppStore((s) => s.currency);
  const navigate = useAppStore((s) => s.navigate);
  const showToast = useAppStore((s) => s.showToast);
  const pendingFabAction = useAppStore((s) => s.pendingFabAction);
  const clearPendingFabAction = useAppStore((s) => s.clearPendingFabAction);

  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: txData } = useTransactions({ limit: '3' });
  const { data: buckets } = useBuckets();
  const createTx = useCreateTransaction();
  const boostBucket = useBoostBucket();

  const [modal, setModal] = useState<ModalConfig | null>(null);

  const liquidity = stats?.liquidity ?? 0;
  const healthScore = stats?.healthScore ?? 0;
  const grade = healthScore >= 85 ? 'A+' : healthScore >= 70 ? 'A' : healthScore >= 55 ? 'B+' : healthScore >= 40 ? 'B' : 'C';
  const gradeMsg = healthScore >= 70 ? "You're killing it, chief." : healthScore >= 40 ? 'Steady progress. Keep stashing.' : 'Time to lock in, chief.';

  const recentTx = txData?.items ?? [];

  // ── FAB action listener ──────────────────────────────────────────────────
  useEffect(() => {
    if (!pendingFabAction) return;
    if (pendingFabAction === 'quick_spend') {
      openQuickSpend();
      clearPendingFabAction();
    } else if (pendingFabAction === 'load_up') {
      openLoadUp();
      clearPendingFabAction();
    } else if (pendingFabAction === 'boost') {
      openBoost();
      clearPendingFabAction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFabAction]);

  // ── Modals ───────────────────────────────────────────────────────────────

  function openQuickSpend() {
    setModal({
      title: 'Quick Spend',
      subtitle: 'Log a fast transaction.',
      submitLabel: 'Log It',
      fields: [
        { name: 'merchant', label: 'Merchant', type: 'text', placeholder: 'TACO HEAVEN', required: true },
        {
          name: 'amount',
          label: `Amount (${currency})`,
          type: 'number',
          step: '0.01',
          min: '0.01',
          placeholder: '0.00',
          required: true,
          inputmode: 'decimal',
        },
        {
          name: 'category',
          label: 'Category',
          type: 'select',
          options: Object.entries(CATEGORY_META)
            .filter(([k]) => k !== 'INCOME')
            .map(([k, v]) => ({ value: k, label: `${v.emoji} ${v.label}` })),
        },
      ],
      onSubmit: (values) => {
        const displayAmount = Number(values.amount);
        if (!Number.isFinite(displayAmount) || displayAmount <= 0) {
          showToast('Enter a valid amount.', 'error');
          return false;
        }
        const amount = displayToUsd(displayAmount, currency);
        createTx.mutate(
          {
            merchant: values.merchant.trim().toUpperCase(),
            amount,
            type: 'EXPENSE',
            category: (values.category ?? 'OTHER') as never,
            tags: [],
          },
          { onSuccess: () => showToast(`Logged ${formatMoney(amount, currency)} ✓`, 'success') },
        );
        return true;
      },
    });
  }

  function openLoadUp() {
    setModal({
      title: 'Load Up',
      subtitle: 'Add funds to your stash.',
      submitLabel: 'Load Up',
      fields: [
        { name: 'merchant', label: 'Source', type: 'text', placeholder: 'PAYCHECK', required: true },
        {
          name: 'amount',
          label: `Amount (${currency})`,
          type: 'number',
          step: '0.01',
          min: '0.01',
          value: '250.00',
          placeholder: '0.00',
          required: true,
          inputmode: 'decimal',
        },
      ],
      onSubmit: (values) => {
        const displayAmount = Number(values.amount);
        if (!Number.isFinite(displayAmount) || displayAmount <= 0) {
          showToast('Enter a valid amount.', 'error');
          return false;
        }
        const amount = displayToUsd(displayAmount, currency);
        createTx.mutate(
          {
            merchant: values.merchant.trim().toUpperCase() || 'MANUAL DEPOSIT',
            amount,
            type: 'INCOME',
            category: 'INCOME',
            tags: [],
          },
          { onSuccess: () => showToast(`Loaded ${formatMoney(amount, currency)} ✓`, 'success') },
        );
        return true;
      },
    });
  }

  function openBoost() {
    const lowestBucket = [...(buckets ?? [])]
      .sort((a, b) => (a.savedUsd / a.targetUsd) - (b.savedUsd / b.targetUsd))[0];
    if (!lowestBucket) {
      showToast('Create a bucket first.', 'info');
      navigate('buckets');
      return;
    }
    setModal({
      title: 'Quick Boost',
      subtitle: `Auto-targeting "${lowestBucket.name}" (your lowest bucket).`,
      submitLabel: 'Boost',
      fields: [
        {
          name: 'amountUsd',
          label: `Amount (${currency})`,
          type: 'number',
          step: '0.01',
          min: '0.01',
          value: '25',
          required: true,
        },
      ],
      onSubmit: (v) => {
        const displayAmt = Number(v.amountUsd);
        if (!Number.isFinite(displayAmt) || displayAmt <= 0) {
          showToast('Enter a valid amount.', 'error');
          return false;
        }
        const amt = displayToUsd(displayAmt, currency);
        boostBucket.mutate(
          { id: lowestBucket.id, amountUsd: amt },
          { onSuccess: () => showToast(`Boosted ${lowestBucket.name}! ⚡`, 'success') },
        );
        return true;
      },
    });
  }

  // ── Category breakdown ───────────────────────────────────────────────────
  const categoryBreakdown = stats?.categoryBreakdown ?? {};
  const topCategories = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const bucketList = (buckets ?? []).slice(0, 3);

  return (
    <>
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 space-y-8 max-w-5xl mx-auto"
      >
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-primary-container p-8 border-4 border-inverse-surface hard-shadow-lg flex flex-col justify-between min-h-[280px]">
            <div>
              <h2 className="font-headline text-5xl font-black tracking-tighter leading-none mb-1">DASH</h2>
              <p className="font-headline font-bold text-base uppercase opacity-70 tracking-widest">
                Stashing hard or hardly stashing?
              </p>
            </div>
            <div className="flex items-end justify-between mt-8 flex-wrap gap-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Total Liquidity</span>
                <span
                  id="total-liquidity-value"
                  className="text-6xl font-headline font-black leading-none"
                >
                  {statsLoading ? (
                    <span className="inline-block w-48 h-14 bg-black/10 animate-pulse" />
                  ) : (
                    formatMoney(liquidity, currency)
                  )}
                </span>
              </div>
              <div className="bg-secondary p-3 border-4 border-inverse-surface rotate-2 hard-shadow">
                <span className="text-white font-headline text-3xl font-black">STABLE</span>
              </div>
            </div>
          </div>

          {/* Grade card */}
          <div className="bg-tertiary-container p-6 border-4 border-inverse-surface hard-shadow-lg flex flex-col items-center justify-center text-center relative overflow-hidden">
            <span className="absolute top-3 left-4 font-headline font-bold text-[10px] uppercase tracking-[0.2em] opacity-60">
              Current Vibes
            </span>
            <div className="text-[110px] font-headline font-black leading-none text-tertiary drop-shadow-[4px_4px_0px_#0c0f0f] select-none">
              {grade}
            </div>
            <p className="font-bold text-sm uppercase mt-3 opacity-80">{gradeMsg}</p>
            <div className="w-full h-3 border-2 border-inverse-surface mt-5 bg-white overflow-hidden">
              <motion.div
                className="bg-primary h-full border-r-2 border-inverse-surface"
                initial={{ width: 0 }}
                animate={{ width: `${healthScore}%` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              />
            </div>
          </div>
        </motion.section>

        {/* ── Quick Actions ─────────────────────────────────────────────────── */}
        <motion.section variants={itemVariants} className="flex flex-wrap gap-3">
          <button
            onClick={openQuickSpend}
            className="interactive-lift bg-secondary-container font-headline font-black text-lg px-8 py-5 border-4 border-inverse-surface hard-shadow flex items-center gap-3 cursor-pointer"
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
            QUICK SPEND
          </button>
          <button
            onClick={openLoadUp}
            className="interactive-lift bg-white font-headline font-black text-lg px-8 py-5 border-4 border-inverse-surface hard-shadow flex items-center gap-3 cursor-pointer"
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              add_card
            </span>
            LOAD UP
          </button>
        </motion.section>

        {/* ── Bento Grid ───────────────────────────────────────────────────── */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Heat Map */}
          <div className="md:col-span-3 bg-white border-4 border-inverse-surface hard-shadow-lg p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-headline text-2xl font-black uppercase italic underline decoration-secondary decoration-4">
                Heat Map
              </h3>
              <span className="text-[10px] font-black px-3 py-1 bg-inverse-surface text-white uppercase tracking-widest">
                Last 30 Days
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {topCategories.length > 0
                ? topCategories.map(([cat, amt]) => {
                  const meta = CATEGORY_META[cat] ?? CATEGORY_META.OTHER;
                  return (
                    <div
                      key={cat}
                      className={`${CATEGORY_COLORS[cat] ?? 'bg-surface-container'} border-2 border-inverse-surface p-4 hard-shadow-sm interactive-soft cursor-pointer`}
                    >
                      <div className="text-3xl mb-2">{meta.emoji}</div>
                      <div className="font-headline font-black text-sm uppercase truncate" title={meta.label}>
                        {meta.label}
                      </div>
                      <div className="text-xs font-bold opacity-70 mt-1">
                        {formatCompactMoney(amt, currency)}
                      </div>
                    </div>
                  );
                })
                : [0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-surface-container border-2 border-inverse-surface p-4 h-28 animate-pulse"
                  />
                ))}
            </div>
          </div>

          {/* Savings Clout */}
          <div className="md:col-span-1 bg-inverse-surface text-white p-6 border-4 border-inverse-surface hard-shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="font-headline font-black text-lg mb-4 uppercase">Savings Clout</h3>
              <div className="space-y-4">
                {bucketList.length === 0
                  ? [0, 1, 2].map((i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-3 bg-white/10 animate-pulse w-3/4" />
                      <div className="w-full h-2 bg-white/10">
                        <div className="h-full bg-white/20 w-1/3 animate-pulse" />
                      </div>
                    </div>
                  ))
                  : bucketList.map((b, i) => {
                    const pct = Math.round((b.savedUsd / b.targetUsd) * 100);
                    return (
                      <div key={b.id}>
                        <div className="flex justify-between text-xs font-bold uppercase mb-1">
                          <span className="truncate max-w-[80%]">{b.name}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/20">
                          <motion.div
                            className={`${['bg-[#cafd00]', 'bg-[#ffbdf3]', 'bg-[#bba2ff]'][i % 3]} h-full`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 + i * 0.1 }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            <button
              onClick={() => navigate('buckets')}
              className="mt-6 w-full border-2 border-white/60 py-2.5 font-headline font-black text-xs uppercase hover:bg-white hover:text-inverse-surface transition-colors active-press cursor-pointer"
            >
              View All Buckets
            </button>
          </div>
        </motion.section>

        {/* ── Recent Receipts ───────────────────────────────────────────────── */}
        <motion.section variants={itemVariants} className="space-y-4">
          <h3 className="font-headline text-3xl font-black uppercase underline decoration-primary decoration-8">
            Receipts
          </h3>

          <div className="space-y-2.5">
            {statsLoading && recentTx.length === 0 ? (
              // Skeleton loaders that match the actual receipt card
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white border-2 border-inverse-surface p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-surface-container animate-pulse border-2 border-inverse-surface" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-surface-container animate-pulse" />
                      <div className="h-3 w-20 bg-surface-container animate-pulse" />
                    </div>
                  </div>
                  <div className="h-6 w-20 bg-surface-container animate-pulse" />
                </div>
              ))
            ) : recentTx.length === 0 ? (
              <div className="bg-white border-2 border-inverse-surface p-8 text-center">
                <p className="font-headline font-black text-xl uppercase mb-1">No transactions yet</p>
                <p className="font-bold text-on-surface-variant text-sm">
                  Hit Quick Spend to log your first one.
                </p>
              </div>
            ) : (
              recentTx.map((tx) => {
                const meta = CATEGORY_META[tx.category] ?? CATEGORY_META.OTHER;
                const isIncome = tx.type === 'INCOME';
                const iconTheme = RECEIPT_ICON_COLORS[tx.category] ?? RECEIPT_ICON_COLORS.OTHER;
                const isOpt = (tx as any).isOptimistic;

                return (
                  <motion.div
                    key={tx.id}
                    layout
                    className={[
                      'bg-white border-2 border-inverse-surface hard-shadow p-4',
                      'flex items-center justify-between gap-3',
                      'hover:translate-x-0.5 transition-transform cursor-pointer',
                      isOpt ? 'pulse-sync opacity-60 border-dashed bg-surface-container' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 shrink-0 ${iconTheme} border-2 border-inverse-surface flex items-center justify-center`}
                      >
                        <span className="material-symbols-outlined text-base">{meta.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-headline font-black text-base leading-tight truncate flex items-center gap-2">
                          {tx.merchant}
                          {isOpt && (
                            <span className="text-[8px] font-black tracking-wider text-white bg-black px-1.5 py-0.5 uppercase pulse-sync shrink-0">
                              Syncing
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-wide">
                          {new Date(tx.createdAt).toLocaleDateString()} · {meta.label}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-headline font-black text-lg leading-tight ${isIncome ? 'text-primary-dim' : 'text-error'
                          }`}
                      >
                        {isIncome ? '+' : '−'}{formatMoney(tx.amount, currency)}
                      </p>
                      <p className="text-[9px] font-black bg-surface-container px-1.5 py-0.5 uppercase tracking-wide">
                        {isIncome ? 'Secured' : 'Spent'}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          <button
            onClick={() => navigate('feed')}
            className="w-full border-4 border-inverse-surface py-3 font-headline font-black uppercase text-sm hard-shadow hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all bg-white cursor-pointer"
          >
            View All Receipts →
          </button>
        </motion.section>

        {/* ── AI Insight Banner (replaces referral promo) ───────────────────── */}
        <motion.section variants={itemVariants}>
          <div className="bg-inverse-surface border-4 border-inverse-surface p-7 relative overflow-hidden">
            <div className="relative z-10">
              <span className="bg-[#cafd00] text-inverse-surface font-headline font-black text-[10px] uppercase tracking-[0.2em] px-3 py-1 inline-block mb-4">
                💡 Today's Intel
              </span>
              <p className="font-headline font-black text-2xl text-white leading-snug mb-4 max-w-lg">
                {stats?.topCategory
                  ? `Your top spend this month is ${(CATEGORY_META[stats.topCategory] ?? CATEGORY_META.OTHER).label}. Trim it by 20% to recover ${formatMoney(stats.recoveryMove ?? 0, currency)}.`
                  : 'Log your first transactions to unlock AI-powered spending insights.'}
              </p>
              <button
                onClick={() => navigate('intel')}
                className="bg-[#cafd00] text-inverse-surface font-headline font-black text-sm uppercase px-5 py-3 border-2 border-white/30 hard-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer active-press"
              >
                Open Intel →
              </button>
            </div>
            <div className="absolute right-[-16px] bottom-[-16px] rotate-[-12deg] opacity-10 pointer-events-none">
              <span
                className="material-symbols-outlined text-white"
                style={{ fontSize: '180px', fontVariationSettings: "'FILL' 1" }}
              >
                psychology
              </span>
            </div>
          </div>
        </motion.section>
      </motion.main>

      <ActionModal config={modal} onClose={() => setModal(null)} />
    </>
  );
}