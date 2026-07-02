'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app';
import { formatMoney } from '@/lib/currencies';
import ActionModal from '@/components/ui/ActionModal';
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

interface Account {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  colorTheme: string | null;
}

type ModalConfig = React.ComponentProps<typeof ActionModal>['config'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 24 } },
} as const;

const BILL_CATEGORIES = [
  { value: 'BILLS', label: '🧾 Bills' },
  { value: 'ENTERTAINMENT', label: '🎮 Entertainment' },
  { value: 'FOOD', label: '🍔 Food' },
  { value: 'TRANSPORT', label: '🚌 Transport' },
  { value: 'OTHER', label: '📦 Other' },
];

const BILLING_CYCLES = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
];

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyClasses(days: number): { bg: string; label: string } {
  if (days < 0) return { bg: 'bg-[#ff4444] text-white border-[#cc0000]', label: `${Math.abs(days)}d overdue` };
  if (days === 0) return { bg: 'bg-[#ff4444] text-white border-[#cc0000]', label: 'Due TODAY' };
  if (days <= 3) return { bg: 'bg-[#ff8800] text-white border-[#cc6600]', label: `${days}d left` };
  if (days <= 7) return { bg: 'bg-primary-container border-inverse-surface', label: `${days}d left` };
  return { bg: 'bg-surface-container border-inverse-surface', label: `${days}d left` };
}

// Returns today + n days in YYYY-MM-DD for date input defaultValue
function dateInputDefault(daysFromNow = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

// Converts YYYY-MM-DD to a full ISO datetime string the API expects
function dateToISO(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toISOString();
}

function BillSkeleton() {
  return (
    <div className="bg-white border-4 border-inverse-surface p-5 flex items-center gap-4 animate-pulse">
      <div className="w-[72px] h-12 bg-surface-container border-2 border-inverse-surface shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 bg-surface-container" />
        <div className="h-3 w-28 bg-surface-container" />
      </div>
      <div className="h-6 w-20 bg-surface-container" />
      <div className="flex gap-2">
        <div className="h-9 w-14 bg-surface-container border-2 border-inverse-surface" />
        <div className="h-9 w-9 bg-surface-container border-2 border-inverse-surface" />
      </div>
    </div>
  );
}

export default function BillsPage() {
  const currency = useAppStore((s) => s.currency);
  const showToast = useAppStore((s) => s.showToast);
  const qc = useQueryClient();
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const { data, isLoading } = useQuery<{ bills: Bill[] }>({
    queryKey: ['bills'],
    queryFn: () =>
      fetch('/api/bills').then((r) => r.json()).then((d) => d.data),
  });

  // Fetch accounts for the account selector in create/pay modals
  const { data: accountsData } = useQuery<{ accounts: Account[] }>({
    queryKey: ['accounts'],
    queryFn: () =>
      fetch('/api/accounts').then((r) => r.json()).then((d) => d.data),
  });
  const accounts = accountsData?.accounts ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────

  const createBill = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (!res.success) {
        showToast(res.error || 'Failed to add bill.', 'error');
        return;
      }
      qc.invalidateQueries({ queryKey: ['bills'] });
      showToast('Bill added! ✓', 'success');
    },
    onError: () => showToast('Failed to add bill.', 'error'),
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
      showToast('Bill paid! Receipt logged. ✓', 'success');
    },
    onError: () => showToast('Failed to mark bill as paid.', 'error'),
  });

  const deleteBill = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/bills/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      showToast('Bill closed.', 'info');
    },
    onError: () => showToast('Failed to close bill.', 'error'),
  });

  const bills = data?.bills ?? [];
  const overdue = bills.filter((b) => daysUntil(b.nextDueDate) < 0);
  const upcoming = bills.filter((b) => daysUntil(b.nextDueDate) >= 0);

  // ── Modal openers ──────────────────────────────────────────────────────

  function openCreateBill() {
    const accountOptions = accounts.map((a) => ({
      value: a.id,
      label: `${a.name} (${formatMoney(a.currentBalance, currency)})`,
    }));

    setModal({
      title: 'Add Bill',
      subtitle: 'Track a recurring obligation.',
      submitLabel: 'Add Bill',
      fields: [
        {
          name: 'name',
          label: 'Bill name',
          type: 'text',
          placeholder: 'Electric Bill',
          required: true,
        },
        {
          name: 'category',
          label: 'Category',
          type: 'select',
          value: 'BILLS',
          options: BILL_CATEGORIES,
        },
        {
          name: 'amountExpected',
          label: `Expected amount (${currency})`,
          type: 'number',
          step: '0.01',
          min: '0.01',
          placeholder: '0.00',
          inputmode: 'decimal',
          hint: 'Leave blank if the amount varies each month.',
        },
        {
          name: 'billingCycle',
          label: 'Billing cycle',
          type: 'select',
          value: 'MONTHLY',
          options: BILLING_CYCLES,
        },
        {
          name: 'nextDueDate',
          label: 'Next due date',
          type: 'date',
          value: dateInputDefault(30),
          required: true,
        },
        ...(accountOptions.length > 0
          ? [{
            name: 'accountId',
            label: 'Pay from account',
            type: 'select' as const,
            options: [
              { value: '', label: '— No account —' },
              ...accountOptions,
            ],
          }]
          : []),
        {
          name: 'reminderDaysBefore',
          label: 'Remind me (days before)',
          type: 'number',
          value: '3',
          min: '0',
          max: '30',
          placeholder: '3',
        },
        {
          name: 'notes',
          label: 'Notes (optional)',
          type: 'textarea',
          placeholder: 'Auto-charged from checking account.',
        },
      ],
      onSubmit: (values) => {
        const name = values.name?.trim();
        if (!name) {
          showToast('Bill name is required.', 'error');
          return false;
        }
        if (!values.nextDueDate) {
          showToast('Due date is required.', 'error');
          return false;
        }

        const body: Record<string, unknown> = {
          name,
          category: values.category || 'BILLS',
          billingCycle: values.billingCycle || 'MONTHLY',
          nextDueDate: dateToISO(values.nextDueDate),
          autopay: false,
          reminderDaysBefore: Number(values.reminderDaysBefore || 3),
        };

        if (values.amountExpected && Number(values.amountExpected) > 0) {
          body.amountExpected = Number(values.amountExpected);
        }
        if (values.accountId) body.accountId = values.accountId;
        if (values.notes?.trim()) body.notes = values.notes.trim();

        createBill.mutate(body);
        return true;
      },
    });
  }

  function openMarkPaid(bill: Bill) {
    const accountOptions = accounts.map((a) => ({
      value: a.id,
      label: `${a.name} (${formatMoney(a.currentBalance, currency)})`,
    }));

    setModal({
      title: 'Mark Bill Paid',
      subtitle: bill.name,
      submitLabel: 'Confirm Payment',
      fields: [
        {
          name: 'amountPaid',
          label: `Amount paid (${currency})`,
          type: 'number',
          step: '0.01',
          min: '0.01',
          value: bill.amountExpected != null ? String(bill.amountExpected) : '',
          placeholder: '0.00',
          required: true,
          inputmode: 'decimal',
          hint: bill.amountExpected
            ? `Expected: ${formatMoney(bill.amountExpected, currency)}`
            : 'Enter the actual amount you paid.',
        },
        ...(accountOptions.length > 0
          ? [{
            name: 'accountId',
            label: 'Deduct from account',
            type: 'select' as const,
            options: [
              { value: '', label: '— No account —' },
              ...accountOptions,
            ],
          }]
          : []),
      ],
      onSubmit: (values) => {
        const amt = parseFloat(values.amountPaid);
        if (!Number.isFinite(amt) || amt <= 0) {
          showToast('Enter a valid payment amount.', 'error');
          return false;
        }
        markPaid.mutate({ id: bill.id, amount: amt });
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
        className="p-6 space-y-8 max-w-2xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h2 className="font-headline text-5xl font-black uppercase italic tracking-tighter leading-none">
              BILLS
            </h2>
            <p className="font-bold text-on-surface-variant text-sm mt-1 uppercase tracking-wider">
              {isLoading
                ? 'Loading your bills...'
                : overdue.length > 0
                  ? `⚠️ ${overdue.length} overdue — handle immediately.`
                  : upcoming.length > 0
                    ? `${upcoming.length} upcoming obligation${upcoming.length > 1 ? 's' : ''}.`
                    : 'Clear board. No active bills.'}
            </p>
          </div>

          {/* ADD BILL button — primary CTA */}
          <button
            onClick={openCreateBill}
            className="interactive-lift bg-primary-container border-4 border-inverse-surface px-5 py-3 hard-shadow flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-xl leading-none">add</span>
            <span className="font-headline font-black text-sm uppercase">Add Bill</span>
          </button>
        </motion.div>

        {/* Stats row — only when data loaded and bills exist */}
        {!isLoading && bills.length > 0 && (
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
            {[
              {
                label: 'Total Bills',
                value: bills.length.toString(),
              },
              {
                label: 'Due This Week',
                value: bills
                  .filter((b) => {
                    const d = daysUntil(b.nextDueDate);
                    return d <= 7 && d >= 0;
                  })
                  .length.toString(),
              },
              {
                label: 'Total Expected',
                value: formatMoney(
                  bills.reduce((s, b) => s + (b.amountExpected ?? 0), 0),
                  currency,
                ),
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white border-4 border-inverse-surface hard-shadow p-4 text-center"
              >
                <div className="font-headline font-black text-xl">{stat.value}</div>
                <div className="font-bold text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Skeleton loaders */}
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <BillSkeleton key={i} />)}
          </div>
        )}

        {/* Overdue section */}
        {!isLoading && overdue.length > 0 && (
          <motion.section variants={itemVariants} className="space-y-3">
            <h3 className="font-headline font-black text-xl uppercase underline decoration-[#ff4444] decoration-4">
              🔴 Overdue
            </h3>
            <AnimatePresence mode="popLayout">
              {overdue.map((bill) => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  currency={currency}
                  onPay={() => openMarkPaid(bill)}
                  onDelete={() => deleteBill.mutate(bill.id)}
                  isDeleting={deleteBill.isPending}
                />
              ))}
            </AnimatePresence>
          </motion.section>
        )}

        {/* Upcoming section */}
        {!isLoading && upcoming.length > 0 && (
          <motion.section variants={itemVariants} className="space-y-3">
            <h3 className="font-headline font-black text-xl uppercase underline decoration-primary decoration-4">
              📅 Upcoming
            </h3>
            <AnimatePresence mode="popLayout">
              {upcoming.map((bill) => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  currency={currency}
                  onPay={() => openMarkPaid(bill)}
                  onDelete={() => deleteBill.mutate(bill.id)}
                  isDeleting={deleteBill.isPending}
                />
              ))}
            </AnimatePresence>
          </motion.section>
        )}

        {/* Empty state */}
        {!isLoading && bills.length === 0 && (
          <motion.div
            variants={itemVariants}
            className="border-4 border-dashed border-inverse-surface p-12 text-center"
          >
            <div className="text-5xl mb-4">🧾</div>
            <p className="font-headline font-black text-2xl uppercase mb-2">No Bills Yet</p>
            <p className="font-bold text-on-surface-variant text-sm max-w-xs mx-auto leading-relaxed mb-6">
              Add your recurring bills to stay ahead of every due date.
            </p>
            <button
              onClick={openCreateBill}
              className="interactive-lift bg-primary-container border-4 border-inverse-surface px-6 py-3 hard-shadow font-headline font-black text-sm uppercase cursor-pointer"
            >
              + Add Your First Bill
            </button>
          </motion.div>
        )}
      </motion.main>

      <ActionModal config={modal} onClose={() => setModal(null)} />
    </>
  );
}

// ── BillRow sub-component ─────────────────────────────────────────────────────

function BillRow({
  bill,
  currency,
  onPay,
  onDelete,
  isDeleting,
}: {
  bill: Bill;
  currency: string;
  onPay: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const days = daysUntil(bill.nextDueDate);
  const urgency = urgencyClasses(days);

  return (
    <motion.div
      layout
      variants={itemVariants}
      exit={{ opacity: 0, x: -12, transition: { duration: 0.18 } }}
      className="bg-white border-4 border-inverse-surface hard-shadow p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform"
    >
      {/* Urgency badge */}
      <div
        className={`${urgency.bg} border-2 px-2 py-2 font-headline font-black text-[11px] uppercase text-center min-w-[72px] leading-tight shrink-0`}
      >
        {urgency.label}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-headline font-black text-base uppercase leading-tight truncate">
          {bill.name}
        </p>
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mt-0.5">
          {bill.billingCycle} · {bill.category}
          {bill.autopay && (
            <span className="ml-2 bg-primary-container px-1.5 py-0.5 text-[9px] border border-inverse-surface">
              AUTOPAY
            </span>
          )}
        </p>
      </div>

      {/* Expected amount */}
      <div className="text-right shrink-0">
        <p className="font-headline font-black text-lg">
          {bill.amountExpected != null
            ? formatMoney(bill.amountExpected, currency as 'USD')
            : '—'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onPay}
          className="bg-[#cafd00] border-2 border-inverse-surface px-3 py-2 font-headline font-black text-xs uppercase hard-shadow active-press hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          Pay
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="border-2 border-inverse-surface px-3 py-2 font-headline font-black text-xs uppercase hover:bg-surface-container transition-all cursor-pointer disabled:opacity-50"
          aria-label={`Close bill: ${bill.name}`}
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}