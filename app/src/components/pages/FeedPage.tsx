'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/app';
import { useTransactions, useDeleteTransaction } from '@/hooks/useStash';
import { formatMoney } from '@/lib/currencies';
import { CATEGORY_META } from '@/lib/constants';

const CARD_THEMES = ['bg-primary-container', 'bg-white', 'bg-secondary-container', 'bg-tertiary-container'];
const TAG_COLORS = ['bg-primary-container', 'bg-secondary-container', 'bg-tertiary-container', 'bg-surface-container-high'];

export default function FeedPage() {
  const currency   = useAppStore((s) => s.currency);
  const showToast  = useAppStore((s) => s.showToast);

  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeType, setActiveType]         = useState<string>('');

  const params: Record<string, string> = {};
  if (activeCategory) params.category = activeCategory;
  if (activeType)     params.type     = activeType;

  const { data, isLoading, refetch } = useTransactions(params);
  const deleteTx = useDeleteTransaction();

  const transactions = data?.items ?? [];

  return (
    <main className="max-w-3xl mx-auto px-4 pt-8 pb-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="font-headline font-black text-6xl tracking-tighter uppercase leading-none">SMART FEED</h1>
          <p className="font-bold text-on-surface-variant uppercase tracking-[0.18em] text-xs mt-2">Transactions, interpreted.</p>
        </div>
        <div className="bg-secondary-container border-2 border-inverse-surface px-4 py-2 hard-shadow-sm font-headline font-bold text-sm italic">AI PATTERN WATCH</div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => { setActiveCategory(''); setActiveType(''); }}
          className={`border-2 border-inverse-surface px-3 py-1 font-headline font-black text-xs uppercase transition-colors ${!activeCategory && !activeType ? 'bg-primary-container' : 'bg-white hover:bg-surface-container'}`}
        >
          All
        </button>
        {['FOOD', 'DRIP', 'ENTERTAINMENT', 'COFFEE', 'TRANSPORT', 'INCOME'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? '' : cat)}
            className={`border-2 border-inverse-surface px-3 py-1 font-headline font-black text-xs uppercase transition-colors ${activeCategory === cat ? 'bg-primary-container' : 'bg-white hover:bg-surface-container'}`}
          >
            {CATEGORY_META[cat]?.emoji} {cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border-4 border-inverse-surface p-6 h-48 animate-pulse" />
          ))}
        </div>
      )}

      {/* Feed */}
      {!isLoading && (
        <div className="space-y-6">
          {transactions.length === 0 && (
            <div className="bg-white border-4 border-inverse-surface p-10 text-center">
              <p className="font-headline font-black text-2xl">Nothing here yet.</p>
              <p className="text-on-surface-variant font-bold mt-2">Log a transaction from the dashboard.</p>
            </div>
          )}

          {transactions.map((tx, i) => {
            const meta    = CATEGORY_META[tx.category] ?? CATEGORY_META.OTHER;
            const isInc   = tx.type === 'INCOME';
            const cardBg  = CARD_THEMES[i % CARD_THEMES.length];
            const tags    = (tx.tags as string[]) ?? [];

            return (
              <article key={tx.id} className={`interactive-lift ${cardBg} border-4 border-inverse-surface p-6 hard-shadow`}>
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white border-2 border-inverse-surface flex items-center justify-center text-3xl hard-shadow-sm">
                      {meta.emoji}
                    </div>
                    <div>
                      <h3 className="font-headline font-extrabold text-2xl uppercase tracking-tight">{tx.merchant}</h3>
                      <p className="text-on-surface-variant font-medium text-sm">
                        {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • {meta.label}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-headline font-black text-3xl ${isInc ? 'text-primary-dim' : 'text-error'}`}>
                      {isInc ? '+' : '-'}{formatMoney(tx.amount, currency)}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{isInc ? 'Income Event' : meta.label}</p>
                  </div>
                </div>

                {/* AI Tags */}
                {tags.length > 0 && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <span className="material-symbols-outlined text-sm text-on-surface-variant opacity-60" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    {tags.map((tag, j) => (
                      <span key={tag} className={`${TAG_COLORS[j % TAG_COLORS.length]} border border-inverse-surface px-3 py-1 text-xs font-black uppercase`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* AI Insight */}
                {tx.aiInsight && (
                  <div className="mt-4 bg-white border-2 border-inverse-surface p-4">
                    <p className="font-headline font-black uppercase text-xs tracking-[0.18em] mb-1">
                      <span className="material-symbols-outlined text-xs align-middle mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                      AI Insight
                    </p>
                    <p className="font-bold text-sm">{tx.aiInsight}</p>
                  </div>
                )}

                {tx.note && (
                  <p className="mt-4 text-sm font-bold text-on-surface-variant">"{tx.note}"</p>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      deleteTx.mutate(tx.id, { onSuccess: () => showToast('Transaction deleted.') });
                    }}
                    className="text-xs font-bold text-on-surface-variant hover:text-error transition-colors uppercase"
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { refetch(); showToast('Feed refreshed.'); }}
        className="fixed bottom-24 right-6 w-16 h-16 bg-primary border-4 border-inverse-surface text-primary-container flex items-center justify-center hard-shadow hover:-translate-x-0.5 hover:-translate-y-0.5 active-press transition-all z-40"
      >
        <span className="material-symbols-outlined text-3xl">auto_awesome</span>
      </button>
    </main>
  );
}
