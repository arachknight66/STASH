'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/app';
import { useStats, useTransactions, useCreateTransaction } from '@/hooks/useStash';
import { useBuckets } from '@/hooks/useStash';
import { formatMoney, formatCompactMoney, displayToUsd } from '@/lib/currencies';
import { CATEGORY_META } from '@/lib/constants';
import ActionModal from '@/components/ui/ActionModal';

type ModalConfig = React.ComponentProps<typeof ActionModal>['config'];

const CATEGORY_COLORS: Record<string, string> = {
  FOOD:          'bg-secondary-container',
  DRIP:          'bg-primary-container',
  ENTERTAINMENT: 'bg-tertiary-container',
  TRANSPORT:     'bg-surface-container',
  BILLS:         'bg-surface-container',
  COFFEE:        'bg-primary-container',
  SAVINGS:       'bg-primary-container',
  INCOME:        'bg-primary-container',
  OTHER:         'bg-surface-container',
};

const RECEIPT_ICON_COLORS: Record<string, string> = {
  FOOD:          'bg-tertiary text-white',
  DRIP:          'bg-secondary text-white',
  ENTERTAINMENT: 'bg-primary text-on-primary',
  TRANSPORT:     'bg-surface-variant text-black',
  BILLS:         'bg-surface-variant text-black',
  COFFEE:        'bg-tertiary text-white',
  SAVINGS:       'bg-primary text-on-primary',
  INCOME:        'bg-primary text-on-primary',
  OTHER:         'bg-surface-variant text-black',
};

export default function DashPage() {
  const currency  = useAppStore((s) => s.currency);
  const navigate  = useAppStore((s) => s.navigate);
  const showToast = useAppStore((s) => s.showToast);

  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: txData }  = useTransactions({ limit: '3' });
  const { data: buckets } = useBuckets();
  const createTx = useCreateTransaction();

  const [modal, setModal] = useState<ModalConfig | null>(null);

  const liquidity   = stats?.liquidity  ?? 0;
  const healthScore = stats?.healthScore ?? 0;
  const grade       = healthScore >= 85 ? 'A+' : healthScore >= 70 ? 'A' : healthScore >= 55 ? 'B+' : healthScore >= 40 ? 'B' : 'C';
  const gradeMsg    = healthScore >= 70 ? "You're killing it, chief." : healthScore >= 40 ? 'Steady progress, keep stashing.' : 'Time to lock in, chief.';

  const recentTx = txData?.items ?? [];

  function openQuickSpend() {
    setModal({
      title: 'Quick Spend',
      subtitle: 'Log a fast transaction.',
      submitLabel: 'Log It',
      fields: [
        { name: 'merchant', label: 'Merchant', type: 'text', placeholder: 'TACO HEAVEN', required: true },
        { name: 'amount', label: `Amount (${currency})`, type: 'number', step: '0.01', min: '0.01', placeholder: '0.00', required: true, inputmode: 'decimal' },
        {
          name: 'category', label: 'Category', type: 'select',
          options: Object.entries(CATEGORY_META)
            .filter(([k]) => k !== 'INCOME')
            .map(([k, v]) => ({ value: k, label: v.label })),
        },
      ],
      onSubmit: (values) => {
        const displayAmount = Number(values.amount);
        if (!Number.isFinite(displayAmount) || displayAmount <= 0) { showToast('Enter a valid amount.'); return false; }
        const amount = displayToUsd(displayAmount, currency);
        createTx.mutate({
          merchant: values.merchant.trim().toUpperCase(),
          amount,
          type: 'EXPENSE',
          category: (values.category ?? 'OTHER') as never,
          tags: [],
        }, {
          onSuccess: () => showToast(`Logged ${formatMoney(amount, currency)} ✅`),
        });
        return true;
      },
    });
  }

  function openLoadUp() {
    setModal({
      title: 'Load Up Wallet',
      subtitle: 'Add funds to your stash instantly.',
      submitLabel: 'Load Up',
      fields: [
        { name: 'merchant', label: 'Source (Where did it come from?)', type: 'text', placeholder: 'PAYCHECK', required: true },
        { name: 'amount', label: `Amount (${currency})`, type: 'number', step: '0.01', min: '0.01', value: '250.00', placeholder: '0.00', required: true, inputmode: 'decimal' },
      ],
      onSubmit: (values) => {
        const displayAmount = Number(values.amount);
        if (!Number.isFinite(displayAmount) || displayAmount <= 0) { showToast('Enter a valid amount.'); return false; }
        const amount = displayToUsd(displayAmount, currency);
        createTx.mutate({
          merchant: values.merchant.trim().toUpperCase() || 'MANUAL DEPOSIT',
          amount,
          type: 'INCOME',
          category: 'INCOME',
          tags: [],
        }, {
          onSuccess: () => showToast(`Loaded ${formatMoney(amount, currency)} ✅`),
        });
        return true;
      },
    });
  }

  const categoryBreakdown = stats?.categoryBreakdown ?? {};
  const topCategories = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const bucketList = (buckets ?? []).slice(0, 3);

  return (
    <>
      <main className="p-6 space-y-8 max-w-5xl mx-auto">

        {/* Hero */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-primary-container p-8 border-4 border-inverse-surface hard-shadow-lg flex flex-col justify-between min-h-[300px]">
            <div>
              <h2 className="font-headline text-5xl font-black tracking-tighter leading-none mb-2">DASH</h2>
              <p className="font-headline font-bold text-xl uppercase opacity-80">STASHING HARD OR HARDLY STASHING?</p>
            </div>
            <div className="flex items-end justify-between mt-8 flex-wrap gap-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-widest opacity-70">Total Liquidity</span>
                <span id="total-liquidity-value" className="text-6xl font-headline font-black">
                  {statsLoading ? '…' : formatMoney(liquidity, currency)}
                </span>
              </div>
              <div className={`bg-secondary p-4 border-4 border-inverse-surface rotate-3 hard-shadow`}>
                <span className="text-on-secondary font-headline text-4xl font-black">STABLE</span>
              </div>
            </div>
          </div>

          <div className="bg-tertiary-container p-8 border-4 border-inverse-surface hard-shadow-lg flex flex-col items-center justify-center text-center relative overflow-hidden">
            <span className="absolute top-4 left-4 font-headline font-bold text-xs uppercase tracking-tighter">Current Vibes</span>
            <div className="text-[120px] font-headline font-black leading-none text-tertiary drop-shadow-[4px_4px_0px_#0c0f0f]">{grade}</div>
            <p className="font-bold text-sm uppercase mt-4">{gradeMsg}</p>
            <div className="w-full h-4 border-2 border-inverse-surface mt-6 bg-white overflow-hidden">
              <div className="bg-primary h-full border-r-2 border-inverse-surface transition-all duration-700" style={{ width: `${healthScore}%` }} />
            </div>
          </div>
        </section>

        {/* Action Bar */}
        <section className="flex flex-wrap gap-4">
          <button
            onClick={openQuickSpend}
            className="bg-secondary-container text-on-secondary-container font-headline font-black text-xl px-10 py-6 border-4 border-inverse-surface hard-shadow hover:-translate-x-1 hover:-translate-y-1 hover:hard-shadow-lg active-press transition-all flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-4xl">bolt</span> QUICK SPEND
          </button>
          <button
            onClick={openLoadUp}
            className="bg-white text-inverse-surface font-headline font-black text-xl px-8 py-6 border-4 border-inverse-surface hard-shadow hover:-translate-x-1 hover:-translate-y-1 hover:hard-shadow-lg transition-all flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-4xl">add_card</span> LOAD UP
          </button>
        </section>

        {/* Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Heat Map */}
          <div className="md:col-span-3 bg-white border-4 border-inverse-surface hard-shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-2xl font-black uppercase italic underline decoration-secondary decoration-4">Heat Map</h3>
              <span className="text-xs font-bold px-3 py-1 bg-inverse-surface text-white">LAST 30 DAYS</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {topCategories.length > 0
                ? topCategories.map(([cat, amt]) => {
                    const meta = CATEGORY_META[cat] ?? CATEGORY_META.OTHER;
                    return (
                      <div key={cat} className={`${CATEGORY_COLORS[cat] ?? 'bg-surface-container'} border-2 border-inverse-surface p-4 hard-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer`}>
                        <div className="text-3xl mb-2">{meta.emoji}</div>
                        <div className="font-headline font-black text-base sm:text-lg truncate" title={meta.label.toUpperCase()}>{meta.label.toUpperCase()}</div>
                        <div className="text-sm font-bold opacity-70">{formatCompactMoney(amt, currency)}</div>
                      </div>
                    );
                  })
                : ['🍔', '👟', '🎮', '🚌'].map((e, i) => (
                    <div key={i} className="bg-surface-container border-2 border-inverse-surface p-4 opacity-50 animate-pulse h-28" />
                  ))}
            </div>
          </div>

          {/* Savings Clout */}
          <div className="md:col-span-1 bg-inverse-surface text-white p-6 border-4 border-inverse-surface hard-shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="font-headline font-black text-xl mb-4">SAVINGS CLOUT</h3>
              <div className="space-y-4">
                {bucketList.map((b, i) => {
                  const pct = Math.round((b.savedUsd / b.targetUsd) * 100);
                  return (
                    <div key={b.id}>
                      <div className="flex justify-between text-xs font-bold uppercase mb-1">
                        <span>{b.name}</span><span>{pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-on-surface-variant">
                        <div className={`${['bg-primary-container', 'bg-secondary-container', 'bg-tertiary-container'][i % 3]} h-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              onClick={() => navigate('buckets')}
              className="mt-8 w-full border-2 border-white py-2 font-headline font-bold text-sm hover:bg-white hover:text-black transition-colors active-press"
            >
              VIEW ALL BUCKETS
            </button>
          </div>
        </section>

        {/* Recent Receipts */}
        <section className="space-y-4">
          <h3 className="font-headline text-3xl font-black uppercase underline decoration-primary decoration-8">Receipts</h3>
          <div className="space-y-3">
            {recentTx.length === 0 && (
              <div className="bg-white border-2 border-inverse-surface p-6 text-center font-bold text-on-surface-variant">
                No transactions yet. Hit QUICK SPEND to log your first one.
              </div>
            )}
            {recentTx.map((tx) => {
              const meta = CATEGORY_META[tx.category] ?? CATEGORY_META.OTHER;
              const isIncome = tx.type === 'INCOME';
              const iconTheme = RECEIPT_ICON_COLORS[tx.category] ?? RECEIPT_ICON_COLORS.OTHER;
              return (
                <div key={tx.id} className="bg-white border-2 border-inverse-surface hard-shadow p-4 flex items-center justify-between hover:translate-x-1 transition-transform cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${iconTheme} border-2 border-inverse-surface flex items-center justify-center`}>
                      <span className={`material-symbols-outlined`}>{meta.icon}</span>
                    </div>
                    <div>
                      <p className="font-headline font-black text-lg">{tx.merchant}</p>
                      <p className="text-xs font-bold opacity-60 uppercase">
                        {new Date(tx.createdAt).toLocaleDateString()} • {meta.label.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-headline font-black text-xl ${isIncome ? 'text-primary-dim' : 'text-error'}`}>
                      {isIncome ? '+' : '-'}{formatMoney(tx.amount, currency)}
                    </p>
                    <p className="text-[10px] font-black bg-error-container text-on-error-container px-2 inline-block">
                      {isIncome ? 'SECURED' : 'SPENT'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => navigate('feed')}
            className="w-full border-4 border-inverse-surface py-3 font-headline font-black uppercase text-sm hard-shadow hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all bg-white"
          >
            VIEW ALL RECEIPTS →
          </button>
        </section>

        {/* Promo Banner */}
        <section className="bg-primary border-4 border-inverse-surface p-8 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-headline font-black text-4xl text-on-primary italic leading-none mb-2">UNLOCK THE VAULT</h3>
            <p className="font-bold text-on-primary max-w-md">Refer a homie and get $50 instantly. No cap. Just vibes and cash.</p>
            <button
              onClick={() => showToast('Link copied! 🔗')}
              className="mt-6 bg-white text-black font-headline font-black px-6 py-3 border-4 border-inverse-surface hard-shadow active-press hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              GET THE LINK
            </button>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] rotate-[-15deg] opacity-20">
            <span className="material-symbols-outlined text-[200px]" style={{ fontVariationSettings: "'FILL' 1" }}>database</span>
          </div>
        </section>

      </main>

      <ActionModal config={modal} onClose={() => setModal(null)} />
    </>
  );
}
