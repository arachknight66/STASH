'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/app';
import { useStats, useIntel } from '@/hooks/useStash';
import { formatMoney, formatCompactMoney } from '@/lib/currencies';
import { useQueryClient } from '@tanstack/react-query';

const BAR_COLORS = ['bg-primary-container', 'bg-secondary-container', 'bg-tertiary-container', 'bg-surface-variant'];

export default function IntelPage() {
  const currency  = useAppStore((s) => s.currency);
  const showToast = useAppStore((s) => s.showToast);
  const { data: stats } = useStats();
  const { data: intel, isLoading: intelLoading, isFetching } = useIntel();
  const qc = useQueryClient();
  const [focusBar, setFocusBar] = useState(0);

  const dailyBurn    = stats?.dailyBurn    ?? 0;
  const runway       = stats?.runway       ?? 0;
  const recoveryMove = stats?.recoveryMove ?? 0;
  const netWorth     = stats?.netWorth     ?? 0;
  const monthlySpend = stats?.monthlySpend ?? 0;
  const breakdown    = stats?.categoryBreakdown ?? {};

  // Build chart bars from real category breakdown
  const bars = Object.entries(breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([label, amount]) => ({
      label,
      amount,
      pct: monthlySpend > 0 ? Math.round((amount / monthlySpend) * 100) : 0,
    }));

  const focused = bars[focusBar] ?? bars[0];

  return (
    <main className="px-4 pt-8 max-w-4xl mx-auto pb-8">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-6xl font-black font-headline tracking-tighter text-inverse-surface uppercase">INTEL</h1>
        <p className="font-bold text-on-surface-variant uppercase tracking-[0.18em] text-xs">AI-powered financial analysis</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Daily Burn',    value: formatMoney(dailyBurn, currency), bg: 'bg-primary-container',   sub: 'Average spend per day.' },
          { label: 'Budget Runway', value: `${runway} days`,                 bg: 'bg-secondary-container', sub: 'How long your pace stays comfy.' },
          { label: 'Recovery Move', value: formatMoney(recoveryMove, currency, { maximumFractionDigits: 0 }), bg: 'bg-tertiary-container', sub: 'Quick win from trimming top category.' },
        ].map(({ label, value, bg, sub }) => (
          <div key={label} className={`interactive-lift ${bg} border-4 border-inverse-surface p-5 hard-shadow`}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">{label}</p>
            <p className="font-headline font-black text-4xl mt-2">{value}</p>
            <p className="text-xs font-bold mt-2 text-on-surface-variant">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Bar Chart */}
        <div className="md:col-span-7 bg-surface-container-lowest border-4 border-inverse-surface p-6 hard-shadow-lg">
          <div className="flex justify-between items-start mb-8 flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-black font-headline uppercase leading-none mb-1">Where did it go?</h2>
              <p className="font-bold text-on-surface-variant opacity-70">TOTAL DAMAGE: {formatMoney(monthlySpend, currency)}</p>
            </div>
            <span className="material-symbols-outlined text-4xl text-primary">analytics</span>
          </div>
          {bars.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="font-bold text-on-surface-variant">No spending data yet.</p>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between h-48 gap-3 mb-4">
                {bars.map((bar, i) => (
                  <div key={bar.label} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setFocusBar(i)}
                      onMouseEnter={() => setFocusBar(i)}
                      onFocus={() => setFocusBar(i)}
                      className={`w-full ${BAR_COLORS[i]} border-4 border-inverse-surface relative cursor-pointer hover:opacity-80 transition-all ${focusBar === i ? 'hard-shadow-sm -translate-y-2' : ''}`}
                      style={{ height: `${bar.pct}%` }}
                    >
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 font-black text-sm whitespace-nowrap">
                        {formatCompactMoney(bar.amount, currency)}
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-center leading-tight">{bar.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant">
                {focused ? `${focused.label.toUpperCase()} now in focus.` : 'Hover a bar to spotlight the category.'}
              </p>
            </>
          )}
        </div>

        {/* AI Vibe Check */}
        <div className="md:col-span-5 flex flex-col gap-6">
          <div className="interactive-lift bg-secondary-container border-4 border-inverse-surface p-4 hard-shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10">
              <span className="material-symbols-outlined text-9xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            </div>
            <h3 className="font-black text-xl font-headline uppercase italic">VIBE CHECK</h3>
            {intelLoading ? (
              <div className="h-16 animate-pulse bg-white/30 mt-2" />
            ) : (
              <p className="font-bold text-sm mb-4 mt-2">{intel?.vibeCheck ?? 'Log some transactions to get your vibe check.'}</p>
            )}
            <button
              onClick={() => { qc.invalidateQueries({ queryKey: ['intel'] }); showToast('Re-analyzing your data... 🧠'); }}
              disabled={isFetching}
              className="w-full bg-inverse-surface text-white py-2 font-black uppercase text-xs hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {isFetching ? 'ANALYZING...' : 'REFRESH ANALYSIS'}
            </button>
          </div>

          <div className="interactive-lift bg-primary-container border-4 border-inverse-surface p-4 hard-shadow-lg">
            <div className="flex items-center gap-4">
              <div className="bg-inverse-surface text-primary-container p-2 border-2 border-inverse-surface">
                <span className="material-symbols-outlined text-3xl">trending_up</span>
              </div>
              <div>
                <h3 className="font-black text-lg font-headline uppercase leading-none">Net Worth</h3>
                <p className="text-2xl font-black">{formatMoney(netWorth, currency)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Pro Insight */}
        <div className="md:col-span-12 relative border-4 border-inverse-surface hard-shadow-lg overflow-hidden hover-glow">
          <div className="absolute inset-0 bg-inverse-surface" />
          <div className="relative p-6">
            <span className="bg-primary text-on-primary px-2 py-1 font-black text-xs uppercase mb-3 inline-block">Pro Intel</span>
            {intelLoading ? (
              <div className="space-y-3">
                <div className="h-8 bg-white/10 animate-pulse w-3/4" />
                <div className="h-4 bg-white/10 animate-pulse w-full" />
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-black text-white font-headline uppercase leading-none mb-3">
                  {intel?.summary ?? 'Start tracking to unlock AI insights.'}
                </h2>
                <p className="text-white font-bold opacity-80 max-w-lg mb-4">
                  {intel?.proInsight ?? 'Add transactions and STASH will analyze your spending patterns.'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* AI Tips */}
        {intel?.tips && intel.tips.length > 0 && (
          <div className="md:col-span-12 bg-white border-4 border-inverse-surface p-6 hard-shadow">
            <h3 className="font-headline font-black text-xl uppercase mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              AI TIPS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {intel.tips.map((tip, i) => (
                <div key={i} className={`${BAR_COLORS[i] ?? 'bg-surface-container'} border-2 border-inverse-surface p-4`}>
                  <p className="font-bold text-sm">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
