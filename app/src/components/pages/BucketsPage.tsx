'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/app';
import { useBuckets, useCreateBucket, useBoostBucket, useDeleteBucket } from '@/hooks/useStash';
import { formatMoney, displayToUsd } from '@/lib/currencies';
import { BUCKET_THEME_CLASSES } from '@/lib/constants';
import ActionModal from '@/components/ui/ActionModal';
import type { Bucket } from '@/lib/types';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }
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
  const currency  = useAppStore((s) => s.currency);
  const showToast = useAppStore((s) => s.showToast);
  const { data: buckets = [], isLoading } = useBuckets();
  const createBucket = useCreateBucket();
  const boostBucket  = useBoostBucket();
  const deleteBucket = useDeleteBucket();
  const [filter, setFilter] = useState<Filter>('all');
  const [modal, setModal]   = useState<ModalConfig | null>(null);

  const filtered = buckets.filter((b) => {
    const p = getBucketProgress(b);
    if (filter === 'close')    return p >= 70 && p < 100;
    if (filter === 'building') return p >= 25 && p < 70;
    if (filter === 'fresh')    return b.isNew || p < 25;
    return true;
  });

  const totalSaved   = buckets.reduce((s, b) => s + b.savedUsd, 0);
  const totalMonthly = buckets.reduce((s, b) => s + b.monthlyUsd, 0);
  const avgProgress  = buckets.length
    ? Math.round(buckets.reduce((s, b) => s + getBucketProgress(b), 0) / buckets.length)
    : 0;

  function openCreate() {
    setModal({
      title: 'New Bucket',
      subtitle: 'Build a goal and track it.',
      submitLabel: 'Create',
      fields: [
        { name: 'name', label: 'Name', type: 'text', placeholder: 'Weekend Escape', required: true },
        { name: 'targetUsd', label: `Target (${currency})`, type: 'number', step: '0.01', min: '0.01', value: '1200', required: true },
        { name: 'savedUsd', label: `Starting Amount (${currency})`, type: 'number', step: '0.01', min: '0', value: '0', required: true },
        { name: 'monthlyUsd', label: `Monthly Auto-Stash (${currency})`, type: 'number', step: '1', min: '0', value: '60', required: true },
        { name: 'theme', label: 'Style', type: 'select', value: 'PRIMARY', options: [
          { value: 'PRIMARY', label: 'Energy Lime' }, { value: 'SECONDARY', label: 'Soft Punch' },
          { value: 'TERTIARY', label: 'Sky Mode' },   { value: 'NEUTRAL', label: 'Classic Mono' },
        ]},
      ],
      onSubmit: (v) => {
        const name = v.name?.trim();
        const displayTarget = Number(v.targetUsd);
        if (!name || !Number.isFinite(displayTarget) || displayTarget <= 0) { showToast('Invalid input.'); return false; }
        createBucket.mutate({ 
          name, 
          subtitle: 'Fresh goal. Clean slate. Lock in.', 
          targetUsd: displayToUsd(displayTarget, currency), 
          savedUsd: displayToUsd(Number(v.savedUsd), currency), 
          monthlyUsd: displayToUsd(Number(v.monthlyUsd), currency), 
          theme: v.theme as never, icon: 'savings', isFeatured: false }, {
          onSuccess: () => showToast(`${name} created! 🎯`),
        });
        return true;
      },
    });
  }

  function openBoost(b: Bucket) {
    setModal({
      title: 'Boost Bucket', subtitle: `Add to "${b.name}"`, submitLabel: 'Boost',
      fields: [{ name: 'amountUsd', label: `Amount (${currency})`, type: 'number', step: '0.01', min: '0.01', value: '25', required: true }],
      onSubmit: (v) => {
        const displayAmt = Number(v.amountUsd);
        if (!Number.isFinite(displayAmt) || displayAmt <= 0) { showToast('Enter a valid amount.'); return false; }
        const amt = displayToUsd(displayAmt, currency);
        boostBucket.mutate({ id: b.id, amountUsd: amt }, { onSuccess: () => showToast(`Boosted ${b.name}! ⚡`) });
        return true;
      },
    });
  }

  return (
    <>
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 max-w-4xl mx-auto"
      >
        <motion.div variants={itemVariants} className="mb-10 flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-headline text-6xl font-black tracking-tighter uppercase leading-none">BUCKETS</h1>
            <p className="font-headline font-bold text-secondary uppercase tracking-widest mt-2">Level up your stash</p>
          </div>
          <button onClick={openCreate} className="interactive-lift bg-primary-container border-4 border-inverse-surface p-4 hard-shadow flex items-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined">add</span>
            <span className="font-headline font-extrabold uppercase">New Bucket</span>
          </button>
        </motion.div>

        {/* Hero stat */}
        <motion.div variants={itemVariants} className="bg-tertiary-container border-4 border-inverse-surface p-6 mb-12 hard-shadow relative overflow-hidden">
          <div className="relative z-10">
            <p className="font-headline font-bold uppercase text-sm mb-1">Total War Chest</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-headline text-7xl font-black tracking-tighter">{formatMoney(totalSaved, currency)}</span>
              <span className="font-headline font-bold text-secondary text-xl">{avgProgress}% funded</span>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[['Active Buckets', String(buckets.length)], ['Monthly Auto-Stash', formatMoney(totalMonthly, currency, { maximumFractionDigits: 0 })], ['Avg Progress', `${avgProgress}%`]].map(([l, v]) => (
                <div key={l} className="bg-white/80 border-2 border-inverse-surface p-4 hard-shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{l}</p>
                  <p className="font-headline font-black text-3xl mt-2">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute right-[-20px] top-[-10px] opacity-10 rotate-12">
            <span className="material-symbols-outlined text-[180px]" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={itemVariants} className="mb-6 flex flex-wrap items-center gap-3">
          {(['all', 'close', 'building', 'fresh'] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`border-2 border-inverse-surface px-4 py-2 font-headline font-black text-xs uppercase transition-colors cursor-pointer ${filter === f ? 'bg-primary-container' : 'bg-white hover:bg-surface-container'}`}>
              {f === 'all' ? 'All Buckets' : f === 'close' ? 'Almost There' : f === 'building' ? 'Building Up' : 'Fresh'}
            </button>
          ))}
          <span className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">{filtered.length} visible.</span>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-64 border-4 border-inverse-surface animate-pulse bg-surface-container" />)}
          </div>
        ) : (
          <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filtered.map((b) => {
              const theme    = BUCKET_THEME_CLASSES[b.theme] ?? BUCKET_THEME_CLASSES.PRIMARY;
              const progress = getBucketProgress(b);
              const eta      = getBucketEta(b);
              return (
                <motion.div
                  variants={itemVariants}
                  key={b.id}
                  className={`${b.isFeatured ? 'md:col-span-2' : ''} ${theme.card} border-4 border-inverse-surface p-6 hard-shadow interactive-lift flex flex-col cursor-pointer group`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className={`${theme.iconWrap} border-2 border-inverse-surface p-3 rotate-[3deg] group-hover:rotate-0 transition-transform`}>
                      <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>{b.icon}</span>
                    </div>
                    <span className="font-headline font-black text-2xl">{progress}%</span>
                  </div>
                  <h3 className="font-headline text-3xl font-black mb-2 uppercase tracking-tight">{b.name}</h3>
                  <p className="font-body font-bold text-on-surface-variant mb-4 text-sm">{b.subtitle}</p>
                  <div className="mt-auto">
                    <div className={`w-full h-12 border-4 border-inverse-surface ${theme.surface} overflow-hidden flex`}>
                      <div className={`h-full ${theme.fill} animate-stripes border-r-4 border-inverse-surface transition-all duration-700`} style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex justify-between mt-2 gap-2 flex-wrap">
                      <span className="font-headline font-bold text-sm">{formatMoney(b.savedUsd, currency)} saved</span>
                      <span className="font-headline font-bold text-sm text-on-surface-variant">{eta}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-inverse-surface/20 flex gap-2 justify-end">
                    <button onClick={(e) => { e.stopPropagation(); openBoost(b); }}
                      className="text-xs font-black uppercase border-2 border-inverse-surface px-3 py-1 bg-white hover:bg-primary-container transition-colors cursor-pointer">
                      Boost +
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteBucket.mutate(b.id, { onSuccess: () => showToast(`${b.name} removed.`) }); }}
                      className="text-xs font-black uppercase border-2 border-inverse-surface px-3 py-1 bg-white hover:bg-error-container transition-colors cursor-pointer">
                      Remove
                    </button>
                  </div>
                </motion.div>
              );
            })}
            <button onClick={openCreate} className="bg-surface-container-highest border-4 border-dashed border-inverse-surface p-6 flex flex-col opacity-80 hover:opacity-100 transition-opacity cursor-pointer min-h-[200px]">
              <div className="flex flex-col items-center justify-center flex-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl mb-4">add_circle</span>
                <p className="font-headline font-black text-xl uppercase">Add Another Bucket</p>
              </div>
            </button>
          </motion.div>
        )}
      </motion.main>

      <button onClick={() => {
        const lowest = [...buckets].sort((a, b) => getBucketProgress(a) - getBucketProgress(b))[0];
        if (lowest) boostBucket.mutate({ id: lowest.id, amountUsd: displayToUsd(25, currency) }, { onSuccess: () => showToast('Quick boost applied! ⚡') });
      }} className="interactive-lift fixed bottom-28 right-6 z-40 bg-secondary p-5 border-4 border-inverse-surface hard-shadow cursor-pointer">
        <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
      </button>

      <ActionModal config={modal} onClose={() => setModal(null)} />
    </>
  );
}
