'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app';
import { formatMoney } from '@/lib/currencies';
import { motion, AnimatePresence } from 'framer-motion';

interface Bill {
  id: string;
  name: string;
  category: string;
  amountExpected: number | null;
  billingCycle: string;
  nextDueDate: string;
  status: string;
  autopay: boolean;
  notes: string | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 22 } },
} as const;

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyColor(days: number): string {
  if (days < 0)  return 'bg-[#ff4444] text-white';
  if (days <= 3) return 'bg-[#ff8800] text-white';
  if (days <= 7) return 'bg-primary-container text-on-surface';
  return 'bg-surface-container text-on-surface-variant';
}

export default function BillsPage() {
  const currency   = useAppStore((s) => s.currency);
  const showToast  = useAppStore((s) => s.showToast);
  const qc         = useQueryClient();
  const [paying, setPaying] = useState<Bill | null>(null);
  const [payAmt, setPayAmt] = useState('');

  const { data, isLoading } = useQuery<{ bills: Bill[] }>({
    queryKey: ['bills'],
    queryFn: () => fetch('/api/bills').then((r) => r.json()).then((d) => d.data),
  });

  const markPaid = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      fetch(`/api/bills/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'mark_paid', amountPaid: amount }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      showToast('Bill paid! Receipt logged. ✅');
      setPaying(null);
      setPayAmt('');
    },
    onError: () => showToast('Failed to mark as paid.'),
  });

  const deleteBill = useMutation({
    mutationFn: (id: string) => fetch(`/api/bills/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bills'] }); showToast('Bill closed.'); },
  });

  const bills = data?.bills ?? [];
  const overdue   = bills.filter((b) => daysUntil(b.nextDueDate) < 0);
  const upcoming  = bills.filter((b) => daysUntil(b.nextDueDate) >= 0);

  function handlePay() {
    if (!paying) return;
    const amt = parseFloat(payAmt);
    if (!amt || amt <= 0) { showToast('Enter a valid amount.'); return; }
    markPaid.mutate({ id: paying.id, amount: amt });
  }

  return (
    <>
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 space-y-8 max-w-2xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <h2 className="font-headline text-5xl font-black uppercase italic tracking-tighter leading-none">
            BILLS
          </h2>
          <p className="font-bold text-on-surface-variant text-sm mt-1 uppercase tracking-wider">
            {overdue.length > 0
              ? `⚠️ ${overdue.length} overdue — handle immediately.`
              : upcoming.length > 0
              ? `${upcoming.length} upcoming obligation${upcoming.length > 1 ? 's' : ''}.`
              : 'Clear board. No bills due.'}
          </p>
        </motion.div>

        {/* Stats row */}
        {bills.length > 0 && (
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
            {[
              { label: 'TOTAL BILLS', value: bills.length, unit: '' },
              { label: 'DUE THIS WEEK', value: bills.filter((b) => daysUntil(b.nextDueDate) <= 7 && daysUntil(b.nextDueDate) >= 0).length, unit: '' },
              {
                label: 'TOTAL EXPECTED',
                value: formatMoney(bills.reduce((s, b) => s + (b.amountExpected ?? 0), 0), currency),
                unit: '',
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border-4 border-inverse-surface hard-shadow p-4 text-center">
                <div className="font-headline font-black text-2xl">{stat.value}</div>
                <div className="font-bold text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Overdue */}
        {overdue.length > 0 && (
          <motion.section variants={itemVariants} className="space-y-3">
            <h3 className="font-headline font-black text-xl uppercase underline decoration-[#ff4444] decoration-4">
              🔴 OVERDUE
            </h3>
            {overdue.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                currency={currency}
                onPay={() => { setPaying(bill); setPayAmt(String(bill.amountExpected ?? '')); }}
                onDelete={() => deleteBill.mutate(bill.id)}
              />
            ))}
          </motion.section>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <motion.section variants={itemVariants} className="space-y-3">
            <h3 className="font-headline font-black text-xl uppercase underline decoration-primary decoration-4">
              📅 UPCOMING
            </h3>
            {upcoming.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                currency={currency}
                onPay={() => { setPaying(bill); setPayAmt(String(bill.amountExpected ?? '')); }}
                onDelete={() => deleteBill.mutate(bill.id)}
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

        {!isLoading && bills.length === 0 && (
          <motion.div variants={itemVariants} className="border-4 border-dashed border-inverse-surface p-12 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="font-headline font-black text-xl uppercase">Clear Board!</p>
            <p className="font-bold text-on-surface-variant text-sm mt-2">No active bills. Add one to stay ahead.</p>
          </motion.div>
        )}
      </motion.main>

      {/* Mark Paid Modal */}
      <AnimatePresence>
        {paying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setPaying(null)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-white border-4 border-inverse-surface hard-shadow-lg p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-headline font-black text-2xl uppercase mb-1">Mark Paid</h3>
              <p className="font-bold text-on-surface-variant text-sm mb-6">{paying.name}</p>
              <label className="block font-headline font-black text-xs uppercase tracking-widest mb-2">Amount Paid</label>
              <input
                type="number"
                step="0.01"
                value={payAmt}
                onChange={(e) => setPayAmt(e.target.value)}
                className="w-full border-2 border-inverse-surface p-3 font-black text-2xl bg-surface-container focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-container mb-6 transition-all"
                placeholder="0.00"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={handlePay}
                  disabled={markPaid.isPending}
                  className="flex-1 bg-primary-container border-4 border-inverse-surface py-3 font-headline font-black uppercase hard-shadow active-press hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {markPaid.isPending ? 'Logging...' : 'CONFIRM PAID'}
                </button>
                <button
                  onClick={() => setPaying(null)}
                  className="px-6 border-4 border-inverse-surface py-3 font-headline font-black uppercase hover:bg-surface-container transition-all cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function BillCard({ bill, currency, onPay, onDelete }: {
  bill: Bill;
  currency: string;
  onPay: () => void;
  onDelete: () => void;
}) {
  const days = daysUntil(bill.nextDueDate);
  const urg  = urgencyColor(days);
  const daysLabel = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due TODAY' : `${days}d left`;

  return (
    <motion.div
      layout
      variants={itemVariants}
      className="bg-white border-4 border-inverse-surface hard-shadow p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform"
    >
      {/* Status badge */}
      <div className={`${urg} px-3 py-2 font-headline font-black text-xs uppercase text-center min-w-[72px] border-2 border-inverse-surface`}>
        {daysLabel}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-headline font-black text-lg uppercase leading-tight truncate">{bill.name}</p>
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          {bill.billingCycle} • {bill.category}
          {bill.autopay && <span className="ml-2 bg-primary-container px-1.5 py-0.5 text-[9px]">AUTOPAY</span>}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right">
        <p className="font-headline font-black text-xl">
          {bill.amountExpected ? formatMoney(bill.amountExpected, currency as 'USD') : '—'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onPay}
          className="bg-[#cafd00] border-2 border-inverse-surface px-3 py-2 font-headline font-black text-xs uppercase hard-shadow active-press hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          PAY
        </button>
        <button
          onClick={onDelete}
          className="border-2 border-inverse-surface px-3 py-2 font-headline font-black text-xs uppercase hover:bg-surface-container transition-all cursor-pointer"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}
