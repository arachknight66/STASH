'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app';
import { formatMoney } from '@/lib/currencies';
import { motion, AnimatePresence } from 'framer-motion';

interface Subscription {
  id: string;
  name: string;
  provider: string;
  category: string;
  amount: number;
  billingCycle: string;
  nextBillingDate: string;
  status: string;
  autopay: boolean;
  icon: string | null;
  colorTheme: string | null;
}

interface BurdenData {
  monthlyTotal: number;
  annualTotal: number;
  burdenPct: number;
  monthlyIncome: number;
}

interface Suggestion {
  merchant: string;
  avgAmount: number;
  occurrences: number;
  suggestedCycle: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 22 } },
} as const;

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function cycleLabel(cycle: string): string {
  const map: Record<string, string> = { WEEKLY: '/wk', MONTHLY: '/mo', QUARTERLY: '/qtr', YEARLY: '/yr', CUSTOM: '' };
  return map[cycle] ?? '/mo';
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-[#cafd00] text-black border-inverse-surface',
  PAUSED: 'bg-surface-container text-on-surface-variant border-inverse-surface',
  TRIAL:  'bg-secondary-container text-on-surface border-inverse-surface',
};

const CYCLE_COLORS = ['bg-primary-container', 'bg-secondary-container', 'bg-tertiary-container', 'bg-[#cafd00]', 'bg-[#ffbdf3]', 'bg-[#bba2ff]'];

export default function SubsPage() {
  const currency  = useAppStore((s) => s.currency);
  const showToast = useAppStore((s) => s.showToast);
  const qc        = useQueryClient();
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const { data: subsData, isLoading } = useQuery<{ subscriptions: Subscription[] }>({
    queryKey: ['subscriptions'],
    queryFn: () => fetch('/api/subscriptions').then((r) => r.json()).then((d) => d.data),
  });

  const { data: burdenData } = useQuery<BurdenData>({
    queryKey: ['subscriptions-burden'],
    queryFn: () => fetch('/api/subscriptions?view=burden').then((r) => r.json()).then((d) => d.data),
  });

  const { data: suggestData } = useQuery<{ suggestions: Suggestion[] }>({
    queryKey: ['subscriptions-suggestions'],
    queryFn: () => fetch('/api/subscriptions?view=suggestions').then((r) => r.json()).then((d) => d.data),
  });

  const cancelSub = useMutation({
    mutationFn: (id: string) => fetch(`/api/subscriptions/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      qc.invalidateQueries({ queryKey: ['subscriptions-burden'] });
      showToast('Subscription canceled. Freedom unlocked. 🔓');
    },
  });

  const pauseSub = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAUSED' }),
      }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); showToast('Subscription paused.'); },
  });

  const subs        = subsData?.subscriptions ?? [];
  const active      = subs.filter((s) => s.status === 'ACTIVE' || s.status === 'TRIAL');
  const paused      = subs.filter((s) => s.status === 'PAUSED');
  const suggestions = (suggestData?.suggestions ?? []).filter((s) => !dismissedSuggestions.has(s.merchant));
  const burden      = burdenData;

  const burdenLabel = !burden ? '—'
    : burden.burdenPct <= 10 ? 'Healthy'
    : burden.burdenPct <= 20 ? 'Watch it'
    : 'Sub-heavy 😬';

  const burdenColor = !burden ? 'bg-surface-container'
    : burden.burdenPct <= 10 ? 'bg-[#cafd00]'
    : burden.burdenPct <= 20 ? 'bg-primary-container'
    : 'bg-[#ff8800]';

  return (
    <motion.main
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 space-y-8 max-w-2xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h2 className="font-headline text-5xl font-black uppercase italic tracking-tighter leading-none">
          SUBS
        </h2>
        <p className="font-bold text-on-surface-variant text-sm mt-1 uppercase tracking-wider">
          {active.length} active subscription{active.length !== 1 ? 's' : ''}. No sneaky charges.
        </p>
      </motion.div>

      {/* Burden Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'MONTHLY COST', value: burden ? formatMoney(burden.monthlyTotal, currency) : '…' },
          { label: 'ANNUAL COST',  value: burden ? formatMoney(burden.annualTotal, currency)  : '…' },
          { label: 'BURDEN',       value: burden ? `${burden.burdenPct}%` : '…', extra: burdenLabel, color: burdenColor },
          { label: 'ACTIVE SUBS',  value: active.length.toString() },
        ].map((card, i) => (
          <div key={card.label} className={`border-4 border-inverse-surface hard-shadow p-4 text-center ${card.color ?? 'bg-white'}`}>
            <div className="font-headline font-black text-2xl">{card.value}</div>
            {card.extra && <div className="font-black text-xs uppercase opacity-70">{card.extra}</div>}
            <div className="font-bold text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">{card.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Burden bar */}
      {burden && (
        <motion.div variants={itemVariants} className="bg-white border-4 border-inverse-surface hard-shadow p-4">
          <div className="flex justify-between text-xs font-black uppercase mb-2">
            <span>INCOME GOING TO SUBSCRIPTIONS</span>
            <span>{burden.burdenPct}%</span>
          </div>
          <div className="w-full h-5 bg-surface-container border-2 border-inverse-surface overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(burden.burdenPct, 100)}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full ${burden.burdenPct > 20 ? 'bg-[#ff4444]' : burden.burdenPct > 10 ? 'bg-[#ff8800]' : 'bg-[#cafd00]'} border-r-2 border-inverse-surface`}
            />
          </div>
        </motion.div>
      )}

      {/* Suggestions Shelf */}
      {suggestions.length > 0 && (
        <motion.section variants={itemVariants} className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="font-headline font-black text-lg uppercase underline decoration-secondary decoration-4">
              🤖 DETECTED RECURRING
            </h3>
            <span className="text-xs font-black bg-secondary-container px-2 py-1 border border-inverse-surface">
              {suggestions.length} found
            </span>
          </div>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            These look like subscriptions you haven't tracked yet.
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {suggestions.map((s) => (
              <motion.div
                key={s.merchant}
                layout
                className="flex-shrink-0 bg-secondary-container border-4 border-inverse-surface p-4 hard-shadow min-w-[180px]"
              >
                <p className="font-headline font-black text-base uppercase truncate">{s.merchant}</p>
                <p className="font-bold text-sm">{formatMoney(s.avgAmount, currency)}<span className="text-xs opacity-60">/{s.suggestedCycle.toLowerCase()}</span></p>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mt-1">{s.occurrences}× detected</p>
                <button
                  onClick={() => setDismissedSuggestions((p) => new Set([...p, s.merchant]))}
                  className="mt-3 text-[10px] font-black uppercase underline opacity-60 hover:opacity-100 cursor-pointer"
                >
                  DISMISS
                </button>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Active Subscriptions */}
      {active.length > 0 && (
        <motion.section variants={itemVariants} className="space-y-3">
          <h3 className="font-headline font-black text-xl uppercase underline decoration-primary decoration-4">
            ✅ ACTIVE
          </h3>
          {active.map((sub, i) => (
            <SubCard
              key={sub.id}
              sub={sub}
              currency={currency}
              colorAccent={CYCLE_COLORS[i % CYCLE_COLORS.length]}
              onPause={() => pauseSub.mutate(sub.id)}
              onCancel={() => cancelSub.mutate(sub.id)}
            />
          ))}
        </motion.section>
      )}

      {/* Paused Subscriptions */}
      {paused.length > 0 && (
        <motion.section variants={itemVariants} className="space-y-3">
          <h3 className="font-headline font-black text-xl uppercase underline decoration-surface-variant decoration-4 opacity-60">
            ⏸ PAUSED
          </h3>
          {paused.map((sub, i) => (
            <SubCard
              key={sub.id}
              sub={sub}
              currency={currency}
              colorAccent="bg-surface-container"
              onPause={() => pauseSub.mutate(sub.id)}
              onCancel={() => cancelSub.mutate(sub.id)}
            />
          ))}
        </motion.section>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 border-4 border-inverse-surface bg-surface-container animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && subs.length === 0 && (
        <motion.div variants={itemVariants} className="border-4 border-dashed border-inverse-surface p-12 text-center">
          <div className="text-4xl mb-3">💸</div>
          <p className="font-headline font-black text-xl uppercase">No Subscriptions Tracked</p>
          <p className="font-bold text-on-surface-variant text-sm mt-2">Add your first sub and stop the mystery charges.</p>
        </motion.div>
      )}
    </motion.main>
  );
}

function SubCard({ sub, currency, colorAccent, onPause, onCancel }: {
  sub: Subscription;
  currency: string;
  colorAccent: string;
  onPause: () => void;
  onCancel: () => void;
}) {
  const days = daysUntil(sub.nextBillingDate);
  const daysLabel = days < 0 ? 'Overdue' : days === 0 ? 'Renews TODAY' : `Renews in ${days}d`;

  return (
    <motion.div
      layout
      variants={itemVariants}
      className="bg-white border-4 border-inverse-surface hard-shadow p-4 flex items-center gap-4 hover:-translate-y-0.5 transition-transform"
    >
      {/* Color accent */}
      <div className={`${colorAccent} border-2 border-inverse-surface w-12 h-12 flex items-center justify-center font-headline font-black text-xl`}>
        {sub.name.charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-headline font-black text-base uppercase truncate">{sub.name}</p>
          <span className={`text-[9px] font-black px-1.5 py-0.5 border uppercase ${STATUS_COLORS[sub.status] ?? 'bg-surface-container border-inverse-surface'}`}>
            {sub.status}
          </span>
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          {daysLabel} • {sub.category}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right mr-2">
        <p className="font-headline font-black text-xl">
          {formatMoney(sub.amount, currency as 'USD')}
          <span className="text-xs font-bold opacity-60">{cycleLabel(sub.billingCycle)}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5">
        {sub.status === 'ACTIVE' && (
          <button
            onClick={onPause}
            className="border-2 border-inverse-surface px-2 py-1 font-headline font-black text-[10px] uppercase hover:bg-surface-container transition-all cursor-pointer"
          >
            PAUSE
          </button>
        )}
        <button
          onClick={onCancel}
          className="border-2 border-[#ff4444] text-[#ff4444] px-2 py-1 font-headline font-black text-[10px] uppercase hover:bg-[#ff4444] hover:text-white transition-all cursor-pointer"
        >
          CANCEL
        </button>
      </div>
    </motion.div>
  );
}
