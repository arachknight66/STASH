'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { formatMoney } from '@/lib/currencies';
import ActionModal from '@/components/ui/ActionModal';
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

interface Account {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
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

type ModalConfig = React.ComponentProps<typeof ActionModal>['config'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 22 } },
} as const;

const CYCLE_COLORS = [
  'bg-primary-container',
  'bg-secondary-container',
  'bg-tertiary-container',
  'bg-[#cafd00]',
  'bg-[#ffbdf3]',
  'bg-[#bba2ff]',
];

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-[#cafd00] text-black border-inverse-surface',
  PAUSED: 'bg-surface-container text-on-surface-variant border-inverse-surface',
  TRIAL: 'bg-secondary-container text-on-surface border-inverse-surface',
};

const SUB_CATEGORIES = [
  { value: 'ENTERTAINMENT', label: '🎮 Entertainment' },
  { value: 'FOOD', label: '🍔 Food' },
  { value: 'DRIP', label: '👟 Drip' },
  { value: 'BILLS', label: '🧾 Bills' },
  { value: 'OTHER', label: '📦 Other' },
];

const BILLING_CYCLES = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const DISMISSED_KEY = 'stash-dismissed-suggestions';

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function cycleLabel(cycle: string): string {
  const map: Record<string, string> = {
    WEEKLY: '/wk', MONTHLY: '/mo', QUARTERLY: '/qtr', YEARLY: '/yr', CUSTOM: '',
  };
  return map[cycle] ?? '/mo';
}

// Returns today + n days in YYYY-MM-DD for date input defaultValue
function dateInputDefault(daysFromNow = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

// Converts YYYY-MM-DD to full ISO datetime the API expects
function dateToISO(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toISOString();
}

function SubSkeleton() {
  return (
    <div className="bg-white border-4 border-inverse-surface hard-shadow p-4 flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 bg-surface-container border-2 border-inverse-surface shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-surface-container" />
        <div className="h-3 w-24 bg-surface-container" />
      </div>
      <div className="h-6 w-20 bg-surface-container" />
      <div className="flex flex-col gap-1.5">
        <div className="h-7 w-14 bg-surface-container" />
        <div className="h-7 w-14 bg-surface-container" />
      </div>
    </div>
  );
}

export default function SubsPage() {
  const currency = useAppStore((s) => s.currency);
  const showToast = useAppStore((s) => s.showToast);
  const navigate = useAppStore((s) => s.navigate);
  const qc = useQueryClient();
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const [auditDismissed, setAuditDismissed] = useState(true);
  useEffect(() => {
    setAuditDismissed(sessionStorage.getItem('stash-sub-audit-dismissed') === 'true');
  }, []);

  const handleDismissAudit = () => {
    sessionStorage.setItem('stash-sub-audit-dismissed', 'true');
    setAuditDismissed(true);
  };

  // Persist dismissed suggestions across navigations
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = sessionStorage.getItem(DISMISSED_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(dismissedSuggestions)));
    } catch { /* sessionStorage unavailable */ }
  }, [dismissedSuggestions]);

  function dismissSuggestion(merchant: string) {
    setDismissedSuggestions((prev) => new Set([...prev, merchant]));
  }

  // ── Data fetching ──────────────────────────────────────────────────────

  const containerRef = useRef<HTMLDivElement>(null);

  const { data: subsData, isLoading: subsLoading, refetch: refetchSubs } = useQuery<{ subscriptions: Subscription[] }>({
    queryKey: ['subscriptions'],
    queryFn: () =>
      fetch('/api/subscriptions').then((r) => r.json()).then((d) => d.data),
  });

  const { data: burdenData, isLoading: burdenLoading, refetch: refetchBurden } = useQuery<BurdenData>({
    queryKey: ['subscriptions-burden'],
    queryFn: () =>
      fetch('/api/subscriptions?view=burden').then((r) => r.json()).then((d) => d.data),
  });

  const { data: suggestData, refetch: refetchSuggestions } = useQuery<{ suggestions: Suggestion[] }>({
    queryKey: ['subscriptions-suggestions'],
    queryFn: () =>
      fetch('/api/subscriptions?view=suggestions').then((r) => r.json()).then((d) => d.data),
  });

  const { isPulling, pullDistance, isRefreshing } = usePullToRefresh(containerRef, async () => {
    await Promise.all([refetchSubs(), refetchBurden(), refetchSuggestions()]);
  });

  const { data: accountsData } = useQuery<{ accounts: Account[] }>({
    queryKey: ['accounts'],
    queryFn: () =>
      fetch('/api/accounts').then((r) => r.json()).then((d) => d.data),
  });
  const accounts = accountsData?.accounts ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────

  const createSub = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (!res.success) {
        showToast(res.error || 'Failed to add subscription.', 'error');
        return;
      }
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      qc.invalidateQueries({ queryKey: ['subscriptions-burden'] });
      showToast('Subscription added! ✓', 'success');
    },
    onError: () => showToast('Failed to add subscription.', 'error'),
  });

  const cancelSub = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/subscriptions/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      qc.invalidateQueries({ queryKey: ['subscriptions-burden'] });
      showToast('Subscription cancelled.', 'info');
    },
    onError: () => showToast('Failed to cancel subscription.', 'error'),
  });

  const pauseSub = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAUSED' }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      showToast('Subscription paused.', 'info');
    },
    onError: () => showToast('Failed to pause subscription.', 'error'),
  });

  const resumeSub = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      showToast('Subscription resumed.', 'success');
    },
    onError: () => showToast('Failed to resume subscription.', 'error'),
  });

  // ── Derived data ───────────────────────────────────────────────────────

  const subs = subsData?.subscriptions ?? [];
  const active = subs.filter((s) => s.status === 'ACTIVE' || s.status === 'TRIAL');
  const paused = subs.filter((s) => s.status === 'PAUSED');
  const burden = burdenData;
  const mostExpensive = active.length > 0 ? active.reduce((a, b) => (a.amount > b.amount ? a : b)) : null;
  const suggestions = (suggestData?.suggestions ?? []).filter(
    (s) => !dismissedSuggestions.has(s.merchant),
  );

  const burdenLabel =
    !burden ? '—'
      : burden.burdenPct <= 10 ? 'Healthy'
        : burden.burdenPct <= 20 ? 'Watch it'
          : 'Sub-heavy 😬';

  const burdenBarColor =
    !burden ? 'bg-surface-container'
      : burden.burdenPct > 20 ? 'bg-[#ff4444]'
        : burden.burdenPct > 10 ? 'bg-[#ff8800]'
          : 'bg-[#cafd00]';

  // ── Modal openers ──────────────────────────────────────────────────────

  function openCreateSub(prefill?: Partial<Suggestion>) {
    const accountOptions = accounts.map((a) => ({
      value: a.id,
      label: `${a.name} (${formatMoney(a.currentBalance, currency)})`,
    }));

    setModal({
      title: 'Add Subscription',
      subtitle: 'Track a recurring charge.',
      submitLabel: 'Add Subscription',
      fields: [
        {
          name: 'name',
          label: 'Subscription name',
          type: 'text',
          placeholder: 'Netflix Premium',
          value: prefill?.merchant ?? '',
          required: true,
        },
        {
          name: 'provider',
          label: 'Provider',
          type: 'text',
          placeholder: 'Netflix',
          value: prefill?.merchant ?? '',
          required: true,
        },
        {
          name: 'amount',
          label: `Amount (${currency})`,
          type: 'number',
          step: '0.01',
          min: '0.01',
          placeholder: '0.00',
          value: prefill?.avgAmount ? String(prefill.avgAmount) : '',
          required: true,
          inputmode: 'decimal',
        },
        {
          name: 'billingCycle',
          label: 'Billing cycle',
          type: 'select',
          value: prefill?.suggestedCycle ?? 'MONTHLY',
          options: BILLING_CYCLES,
        },
        {
          name: 'category',
          label: 'Category',
          type: 'select',
          value: 'ENTERTAINMENT',
          options: SUB_CATEGORIES,
        },
        {
          name: 'nextBillingDate',
          label: 'Next billing date',
          type: 'date',
          value: dateInputDefault(30),
          required: true,
        },
        ...(accountOptions.length > 0
          ? [{
            name: 'accountId',
            label: 'Charge to account',
            type: 'select' as const,
            options: [
              { value: '', label: '— No account —' },
              ...accountOptions,
            ],
          }]
          : []),
        {
          name: 'notes',
          label: 'Notes (optional)',
          type: 'textarea',
          placeholder: 'Family plan, shared with 3 people.',
        },
      ],
      onSubmit: (values) => {
        const name = values.name?.trim();
        const provider = values.provider?.trim();
        const amount = Number(values.amount);

        if (!name) {
          showToast('Subscription name is required.', 'error');
          return false;
        }
        if (!provider) {
          showToast('Provider is required.', 'error');
          return false;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
          showToast('Enter a valid amount.', 'error');
          return false;
        }
        if (!values.nextBillingDate) {
          showToast('Billing date is required.', 'error');
          return false;
        }

        const body: Record<string, unknown> = {
          name,
          provider,
          amount,
          category: values.category || 'ENTERTAINMENT',
          billingCycle: values.billingCycle || 'MONTHLY',
          nextBillingDate: dateToISO(values.nextBillingDate),
          autopay: false,
        };
        if (values.accountId) body.accountId = values.accountId;
        if (values.notes?.trim()) body.notes = values.notes.trim();

        createSub.mutate(body);
        return true;
      },
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <motion.main
        ref={containerRef}
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 space-y-8 max-w-2xl mx-auto"
      >
        <AnimatePresence>
          {(isPulling || isRefreshing) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 48, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center justify-center bg-primary-container border-b-2 border-inverse-surface"
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
        <motion.div variants={itemVariants} className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h2 className="font-headline text-5xl font-black uppercase italic tracking-tighter leading-none">
              SUBS
            </h2>
            <p className="font-bold text-on-surface-variant text-sm mt-1 uppercase tracking-wider">
              {subsLoading
                ? 'Loading subscriptions...'
                : `${active.length} active subscription${active.length !== 1 ? 's' : ''}. No sneaky charges.`}
            </p>
          </div>

          {/* ADD SUB button */}
          <button
            onClick={() => openCreateSub()}
            className="interactive-lift bg-primary-container border-4 border-inverse-surface px-5 py-3 hard-shadow flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-xl leading-none">add</span>
            <span className="font-headline font-black text-sm uppercase">Add Sub</span>
          </button>
        </motion.div>

        {/* Burden stat cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Monthly Cost',
              value: burdenLoading ? '…' : burden ? formatMoney(burden.monthlyTotal, currency) : '—',
              color: '',
            },
            {
              label: 'Annual Cost',
              value: burdenLoading ? '…' : burden ? formatMoney(burden.annualTotal, currency) : '—',
              color: '',
            },
            {
              label: 'Burden',
              value: burdenLoading ? '…' : burden ? `${burden.burdenPct}%` : '—',
              sub: burdenLabel,
              color: burdenLoading ? '' : burden
                ? burden.burdenPct > 20 ? 'bg-error-container'
                  : burden.burdenPct > 10 ? 'bg-primary-container'
                    : 'bg-[#cafd00]'
                : '',
            },
            {
              label: 'Active Subs',
              value: subsLoading ? '…' : active.length.toString(),
              color: '',
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`border-4 border-inverse-surface hard-shadow p-4 text-center ${card.color || 'bg-white'}`}
            >
              <div className="font-headline font-black text-2xl">{card.value}</div>
              {'sub' in card && card.sub && (
                <div className="font-black text-xs uppercase opacity-70">{card.sub}</div>
              )}
              <div className="font-bold text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
                {card.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Burden bar */}
        {!burdenLoading && burden && (
          <motion.div
            variants={itemVariants}
            className="bg-white border-4 border-inverse-surface hard-shadow p-4"
          >
            <div className="flex justify-between text-xs font-black uppercase mb-2">
              <span>Income going to subscriptions</span>
              <span>{burden.burdenPct}%</span>
            </div>
            <div className="w-full h-5 bg-surface-container border-2 border-inverse-surface overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(burden.burdenPct, 100)}%` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className={`h-full ${burdenBarColor} border-r-2 border-inverse-surface`}
              />
            </div>
            {burden.burdenPct > 20 && (
              <p className="text-xs font-bold text-error mt-2">
                ⚠️ Your subscriptions are eating over 20% of income. Consider auditing them.
              </p>
            )}
          </motion.div>
        )}

        {/* Detected recurring suggestions */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.section
              key="suggestions"
              variants={itemVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-3">
                <h3 className="font-headline font-black text-lg uppercase underline decoration-secondary decoration-4">
                  🤖 Detected Recurring
                </h3>
                <span className="text-xs font-black bg-secondary-container px-2 py-1 border border-inverse-surface">
                  {suggestions.length} found
                </span>
              </div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                These look like subscriptions you haven't tracked yet.
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                <AnimatePresence mode="popLayout">
                  {suggestions.map((s) => (
                    <motion.div
                      key={s.merchant}
                      layout
                      exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.15 } }}
                      className="flex-shrink-0 bg-secondary-container border-4 border-inverse-surface p-4 hard-shadow min-w-[180px]"
                    >
                      <p className="font-headline font-black text-base uppercase truncate">
                        {s.merchant}
                      </p>
                      <p className="font-bold text-sm mt-1">
                        {formatMoney(s.avgAmount, currency)}
                        <span className="text-xs opacity-60">/{s.suggestedCycle.toLowerCase()}</span>
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mt-1">
                        {s.occurrences}× detected
                      </p>
                      <div className="mt-3 flex flex-col gap-1.5">
                        {/* One-tap track — pre-fills the modal */}
                        <button
                          onClick={() => openCreateSub(s)}
                          className="text-[10px] font-black uppercase bg-primary-container border border-inverse-surface px-2 py-1 cursor-pointer hover:bg-white transition-colors"
                        >
                          Track It
                        </button>
                        <button
                          onClick={() => dismissSuggestion(s.merchant)}
                          className="text-[10px] font-black uppercase underline opacity-60 hover:opacity-100 cursor-pointer transition-opacity"
                          aria-label={`Dismiss suggestion for ${s.merchant}`}
                        >
                          Dismiss
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Skeleton loaders */}
        {subsLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <SubSkeleton key={i} />)}
          </div>
        )}

        {/* Subscription Audit Card */}
        <AnimatePresence>
          {burden && burden.burdenPct > 15 && !auditDismissed && active.length > 0 && mostExpensive && (
            <motion.div
              key="sub-audit-card"
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="bg-tertiary-container border-4 border-inverse-surface hard-shadow p-5 relative overflow-hidden text-inverse-surface"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-headline font-black text-sm uppercase tracking-wider">
                  🤖 Subscription Audit
                </h4>
                <button
                  onClick={handleDismissAudit}
                  className="cursor-pointer font-bold text-sm leading-none hover:text-error transition-colors"
                  aria-label="Dismiss audit"
                >
                  ✕
                </button>
              </div>
              <p className="font-body font-bold text-xs uppercase tracking-wide opacity-80">
                Subs are eating {burden.burdenPct}% of your income.
              </p>
              <p className="font-body font-bold text-xs uppercase tracking-wide opacity-80 mt-1">
                Biggest: {mostExpensive.name} at {formatMoney(mostExpensive.amount, currency)}/mo
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => navigate('intel')}
                  className="cursor-pointer font-headline font-black text-xs uppercase bg-white border-2 border-inverse-surface px-3 py-1.5 hover:bg-primary-container transition-colors"
                >
                  Open Intel →
                </button>
                <button
                  onClick={handleDismissAudit}
                  className="cursor-pointer font-headline font-black text-xs uppercase underline opacity-60 hover:opacity-100 transition-opacity"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active subscriptions */}
        {!subsLoading && active.length > 0 && (
          <motion.section variants={itemVariants} className="space-y-3">
            <h3 className="font-headline font-black text-xl uppercase underline decoration-primary decoration-4">
              ✅ Active
            </h3>
            <AnimatePresence mode="popLayout">
              {active.map((sub, i) => (
                <SubCard
                  key={sub.id}
                  sub={sub}
                  currency={currency}
                  colorAccent={CYCLE_COLORS[i % CYCLE_COLORS.length]}
                  onPause={() => pauseSub.mutate(sub.id)}
                  onCancel={() => cancelSub.mutate(sub.id)}
                  isPending={pauseSub.isPending || cancelSub.isPending}
                />
              ))}
            </AnimatePresence>
          </motion.section>
        )}

        {/* Paused subscriptions */}
        {!subsLoading && paused.length > 0 && (
          <motion.section variants={itemVariants} className="space-y-3">
            <h3 className="font-headline font-black text-xl uppercase underline decoration-surface-variant decoration-4 opacity-60">
              ⏸ Paused
            </h3>
            <AnimatePresence mode="popLayout">
              {paused.map((sub, i) => (
                <SubCard
                  key={sub.id}
                  sub={sub}
                  currency={currency}
                  colorAccent="bg-surface-container"
                  onPause={() => resumeSub.mutate(sub.id)}
                  pauseLabel="Resume"
                  onCancel={() => cancelSub.mutate(sub.id)}
                  isPending={resumeSub.isPending || cancelSub.isPending}
                />
              ))}
            </AnimatePresence>
          </motion.section>
        )}

        {/* Empty state */}
        {!subsLoading && subs.length === 0 && (
          <motion.div
            variants={itemVariants}
            className="border-4 border-dashed border-inverse-surface p-12 text-center"
          >
            <div className="text-5xl mb-4">💸</div>
            <p className="font-headline font-black text-2xl uppercase mb-2">
              No Subscriptions Tracked
            </p>
            <p className="font-bold text-on-surface-variant text-sm max-w-xs mx-auto leading-relaxed mb-6">
              Add your recurring subscriptions to stop mystery charges sneaking through.
            </p>
            <button
              onClick={() => openCreateSub()}
              className="interactive-lift bg-primary-container border-4 border-inverse-surface px-6 py-3 hard-shadow font-headline font-black text-sm uppercase cursor-pointer"
            >
              + Add Your First Sub
            </button>
          </motion.div>
        )}
      </motion.main>

      <ActionModal config={modal} onClose={() => setModal(null)} />
    </>
  );
}

// ── SubCard sub-component ─────────────────────────────────────────────────────

function SubCard({
  sub,
  currency,
  colorAccent,
  onPause,
  onCancel,
  pauseLabel = 'Pause',
  isPending,
}: {
  sub: Subscription;
  currency: string;
  colorAccent: string;
  onPause: () => void;
  onCancel: () => void;
  pauseLabel?: string;
  isPending: boolean;
}) {
  const days = daysUntil(sub.nextBillingDate);
  const daysLabel =
    days < 0 ? 'Overdue'
      : days === 0 ? 'Renews TODAY'
        : `Renews in ${days}d`;

  return (
    <motion.div
      layout
      variants={itemVariants}
      exit={{ opacity: 0, x: 16, transition: { duration: 0.18 } }}
      className="bg-white border-4 border-inverse-surface hard-shadow p-4 flex items-center gap-4 hover:-translate-y-0.5 transition-transform"
    >
      {/* Color accent with initial */}
      <div
        className={`${colorAccent} border-2 border-inverse-surface w-12 h-12 flex items-center justify-center font-headline font-black text-xl shrink-0`}
        aria-hidden="true"
      >
        {sub.name.charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-headline font-black text-base uppercase truncate">{sub.name}</p>
          <span
            className={`text-[9px] font-black px-1.5 py-0.5 border uppercase shrink-0 ${STATUS_STYLES[sub.status] ?? 'bg-surface-container border-inverse-surface'
              }`}
          >
            {sub.status}
          </span>
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mt-0.5">
          {daysLabel} · {sub.category}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0 mr-1">
        <p className="font-headline font-black text-xl leading-tight">
          {formatMoney(sub.amount, currency as 'USD')}
          <span className="text-xs font-bold opacity-60">{cycleLabel(sub.billingCycle)}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          onClick={onPause}
          disabled={isPending}
          className="border-2 border-inverse-surface px-2 py-1.5 font-headline font-black text-[10px] uppercase hover:bg-surface-container transition-all cursor-pointer disabled:opacity-50"
        >
          {pauseLabel}
        </button>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="border-2 border-[#ff4444] text-[#ff4444] px-2 py-1.5 font-headline font-black text-[10px] uppercase hover:bg-[#ff4444] hover:text-white transition-all cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}