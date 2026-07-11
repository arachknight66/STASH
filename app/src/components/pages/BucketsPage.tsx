'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/app';
import { useBuckets, useCreateBucket, useBoostBucket, useDeleteBucket } from '@/hooks/useStash';
import { formatMoney, displayToUsd } from '@/lib/currencies';
import { BUCKET_THEME_CLASSES } from '@/lib/constants';
import ActionModal from '@/components/ui/ActionModal';
import type { Bucket } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.055 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 14 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 26 },
  },
} as const;

type Filter = 'all' | 'close' | 'building' | 'fresh';
type ModalConfig = React.ComponentProps<typeof ActionModal>['config'];

function getBucketProgress(b: Bucket) {
  return Math.max(0, Math.min(100, Math.round((b.savedUsd / b.targetUsd) * 100)));
}

function getBucketEta(b: Bucket) {
  const remaining = Math.max(b.targetUsd - b.savedUsd, 0);
  if (remaining <= 0) return 'Funded!';
  if (!b.monthlyUsd) return 'No auto-stash';
  const months = Math.ceil(remaining / b.monthlyUsd);
  return months === 1 ? '1 month left' : `${months} months left`;
}

export default function BucketsPage() {
  const currency = useAppStore((s) => s.currency);
  const showToast = useAppStore((s) => s.showToast);
  const pendingFabAction = useAppStore((s) => s.pendingFabAction);
  const clearPendingFabAction = useAppStore((s) => s.clearPendingFabAction);

  const containerRef = useRef<HTMLDivElement>(null);

  const { data: buckets = [], isLoading, refetch } = useBuckets();
  const createBucket = useCreateBucket();
  const boostBucket = useBoostBucket();
  const deleteBucket = useDeleteBucket();

  const { isPulling, pullDistance, isRefreshing } = usePullToRefresh(containerRef, () => {
    refetch();
  });

  const [filter, setFilter] = useState<Filter>('all');
  const [modal, setModal] = useState<ModalConfig | null>(null);

  // Listen for FAB boost action
  useEffect(() => {
    if (pendingFabAction === 'boost') {
      const lowest = [...buckets].sort(
        (a, b) => getBucketProgress(a) - getBucketProgress(b),
      )[0];
      if (lowest) openBoost(lowest);
      clearPendingFabAction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFabAction, buckets]);

  const filtered = buckets.filter((b) => {
    const p = getBucketProgress(b);
    if (filter === 'close') return p >= 70 && p < 100;
    if (filter === 'building') return p >= 25 && p < 70;
    if (filter === 'fresh') return b.isNew || p < 25;
    return true;
  });

  const totalSaved = buckets.reduce((s, b) => s + b.savedUsd, 0);
  const totalMonthly = buckets.reduce((s, b) => s + b.monthlyUsd, 0);
  const avgProgress = buckets.length
    ? Math.round(buckets.reduce((s, b) => s + getBucketProgress(b), 0) / buckets.length)
    : 0;

  // ── Modals ──────────────────────────────────────────────────────────────

  function openCreate() {
    setModal({
      title: 'New Bucket',
      subtitle: 'Build a goal and track it.',
      submitLabel: 'Create',
      fields: [
        {
          name: 'name',
          label: 'Name',
          type: 'text',
          placeholder: 'Weekend Escape',
          required: true,
        },
        {
          name: 'targetUsd',
          label: `Target (${currency})`,
          type: 'number',
          step: '0.01',
          min: '0.01',
          value: '1200',
          required: true,
        },
        {
          name: 'savedUsd',
          label: `Starting Amount (${currency})`,
          type: 'number',
          step: '0.01',
          min: '0',
          value: '0',
          required: true,
        },
        {
          name: 'monthlyUsd',
          label: `Monthly Auto-Stash (${currency})`,
          type: 'number',
          step: '1',
          min: '0',
          value: '60',
          required: true,
        },
        {
          name: 'theme',
          label: 'Style',
          type: 'select',
          value: 'PRIMARY',
          options: [
            { value: 'PRIMARY', label: '🟡 Energy Lime' },
            { value: 'SECONDARY', label: '🩷 Soft Punch' },
            { value: 'TERTIARY', label: '🟣 Sky Mode' },
            { value: 'NEUTRAL', label: '⬜ Classic Mono' },
          ],
        },
      ],
      onSubmit: (v) => {
        const name = v.name?.trim();
        const displayTarget = Number(v.targetUsd);
        if (!name || !Number.isFinite(displayTarget) || displayTarget <= 0) {
          showToast('Invalid input.', 'error');
          return false;
        }
        createBucket.mutate(
          {
            name,
            subtitle: 'Fresh goal. Clean slate. Lock in.',
            targetUsd: displayToUsd(displayTarget, currency),
            savedUsd: displayToUsd(Number(v.savedUsd), currency),
            monthlyUsd: displayToUsd(Number(v.monthlyUsd), currency),
            theme: v.theme as never,
            icon: 'savings',
            isFeatured: false,
          },
          { onSuccess: () => showToast(`${name} created! 🎯`, 'success') },
        );
        return true;
      },
    });
  }

  function openBoost(b: Bucket) {
    setModal({
      title: 'Boost Bucket',
      subtitle: `Add savings to "${b.name}"`,
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
          { id: b.id, amountUsd: amt },
          {
            onSuccess: () => {
              const remaining = Math.max(b.targetUsd - (b.savedUsd + amt), 0);
              const etaMsg    = b.monthlyUsd > 0
                ? (() => { const m = Math.ceil(remaining / b.monthlyUsd); return m <= 0 ? 'almost funded! 🎯' : `funded in ${m} month${m > 1 ? 's' : ''} ⚡`; })()
                : 'boosted! ⚡';
              showToast(`${b.name} — ${etaMsg}`, 'success');
            }
          },
        );
        return true;
      },
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <motion.main
        ref={containerRef}
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 max-w-4xl mx-auto"
      >
        <AnimatePresence>
          {(isPulling || isRefreshing) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 48, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center justify-center bg-primary-container border-b-2 border-inverse-surface mb-4"
            >
              <motion.span
                animate={{ rotate: isRefreshing ? 360 : pullDistance * 3 }}
                transition={isRefreshing ? { repeat: Infinity, duration: 0.6, ease: 'linear' } : { duration: 0 }}
                className="material-symbols-outlined text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isRefreshing ? 'sync' : 'arrow_downward'}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="mb-10 flex justify-between items-end flex-wrap gap-4"
        >
          <div>
            <h1 className="font-headline text-6xl font-black tracking-tighter uppercase leading-none">
              BUCKETS
            </h1>
            <p className="font-headline font-bold text-secondary uppercase tracking-widest mt-2 text-sm">
              Level up your stash
            </p>
          </div>
          <button
            onClick={openCreate}
            className="interactive-lift bg-primary-container border-4 border-inverse-surface p-4 hard-shadow flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined">add</span>
            <span className="font-headline font-extrabold uppercase">New Bucket</span>
          </button>
        </motion.div>

        {/* Hero stat */}
        <motion.div
          variants={itemVariants}
          className="bg-tertiary-container border-4 border-inverse-surface p-6 mb-10 hard-shadow relative overflow-hidden"
        >
          <div className="relative z-10">
            <p className="font-headline font-bold uppercase text-xs tracking-[0.2em] mb-1 opacity-70">
              Total War Chest
            </p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-headline text-6xl font-black tracking-tighter">
                {formatMoney(totalSaved, currency)}
              </span>
              <span className="font-headline font-bold text-secondary text-lg">
                {avgProgress}% funded
              </span>
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                ['Active Buckets', String(buckets.length)],
                [
                  'Monthly Auto-Stash',
                  formatMoney(totalMonthly, currency, { maximumFractionDigits: 0 }),
                ],
                ['Avg Progress', `${avgProgress}%`],
              ].map(([l, v]) => (
                <div
                  key={l}
                  className="bg-white/80 border-2 border-inverse-surface p-3 hard-shadow-sm"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">{l}</p>
                  <p className="font-headline font-black text-2xl mt-1">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute right-[-16px] top-[-8px] opacity-10 rotate-12 pointer-events-none">
            <span
              className="material-symbols-outlined text-[160px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              monetization_on
            </span>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          variants={itemVariants}
          className="mb-6 flex flex-wrap items-center gap-2"
        >
          {(['all', 'close', 'building', 'fresh'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                'border-2 border-inverse-surface px-4 py-2 font-headline font-black text-xs uppercase transition-colors cursor-pointer',
                filter === f
                  ? 'bg-primary-container'
                  : 'bg-white hover:bg-surface-container',
              ].join(' ')}
            >
              {f === 'all'
                ? 'All Buckets'
                : f === 'close'
                  ? 'Almost There'
                  : f === 'building'
                    ? 'Building Up'
                    : 'Fresh'}
            </button>
          ))}
          <span className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant ml-1">
            {filtered.length} visible
          </span>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 border-4 border-inverse-surface animate-pulse bg-surface-container"
              />
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((b) => {
                const theme = BUCKET_THEME_CLASSES[b.theme] ?? BUCKET_THEME_CLASSES.PRIMARY;
                const progress = getBucketProgress(b);
                const eta = getBucketEta(b);
                return (
                  <motion.div
                    key={b.id}
                    variants={itemVariants}
                    layout
                    exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
                    className={[
                      b.isFeatured ? 'md:col-span-2' : '',
                      theme.card,
                      'border-4 border-inverse-surface p-6 hard-shadow interactive-lift interactive-card flex flex-col cursor-pointer group',
                    ].join(' ')}
                  >
                    {/* Top row */}
                    <div className="flex justify-between items-start mb-5">
                      <div
                        className={`${theme.iconWrap} border-2 border-inverse-surface p-3 rotate-[3deg] group-hover:rotate-0 transition-transform`}
                      >
                        <span
                          className="material-symbols-outlined text-3xl"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {b.icon}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-headline font-black text-3xl">{progress}%</span>
                        {b.isNew && (
                          <span className="block text-[9px] font-black uppercase tracking-widest text-secondary mt-0.5">
                            New
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <h3 className="font-headline text-2xl font-black mb-1 uppercase tracking-tight">
                      {b.name}
                    </h3>
                    <p className="font-body font-bold text-on-surface-variant mb-4 text-sm leading-snug">
                      {b.subtitle}
                    </p>

                    {/* Progress bar */}
                    <div className="mt-auto">
                      <div
                        className={`w-full h-10 border-4 border-inverse-surface ${theme.surface} overflow-hidden flex`}
                      >
                        <motion.div
                          className={`h-full ${theme.fill} animate-stripes border-r-4 border-inverse-surface`}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 gap-2 flex-wrap">
                        <span className="font-headline font-bold text-sm">
                          {formatMoney(b.savedUsd, currency)} saved
                        </span>
                        <span className="font-headline font-bold text-sm text-on-surface-variant">
                          {eta}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-inverse-surface/20 flex gap-2 justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openBoost(b);
                        }}
                        className="text-xs font-black uppercase border-2 border-inverse-surface px-3 py-1.5 bg-white hover:bg-primary-container transition-colors cursor-pointer"
                      >
                        Boost +
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBucket.mutate(b.id, {
                            onSuccess: () => showToast(`${b.name} removed.`, 'info'),
                          });
                        }}
                        className="text-xs font-black uppercase border-2 border-inverse-surface px-3 py-1.5 bg-white hover:bg-error-container transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Add new bucket card */}
            <button
              onClick={openCreate}
              className="bg-surface-container-highest border-4 border-dashed border-inverse-surface p-6 flex flex-col opacity-70 hover:opacity-100 transition-opacity cursor-pointer min-h-[200px] group"
            >
              <div className="flex flex-col items-center justify-center flex-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl mb-3 group-hover:scale-110 transition-transform">
                  add_circle
                </span>
                <p className="font-headline font-black text-lg uppercase">Add Another Bucket</p>
              </div>
            </button>
          </motion.div>
        )}
      </motion.main>

      <ActionModal config={modal} onClose={() => setModal(null)} />
    </>
  );
}