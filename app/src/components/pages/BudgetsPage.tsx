'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/app';
import { useBudgets, useCreateBudget, useDeleteBudget, type EnrichedBudget } from '@/hooks/useStash';
import { formatMoney, formatCompactMoney } from '@/lib/currencies';
import { CATEGORY_META } from '@/lib/constants';
import ActionModal from '@/components/ui/ActionModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp';

type ModalConfig = React.ComponentProps<typeof ActionModal>['config'];

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
} as const;

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 24 } },
} as const;

const CATEGORY_OPTIONS = [
    { value: 'FOOD', label: '🍔 Food' },
    { value: 'DRIP', label: '👟 Drip' },
    { value: 'ENTERTAINMENT', label: '🎮 Entertainment' },
    { value: 'TRANSPORT', label: '🚌 Transport' },
    { value: 'BILLS', label: '🧾 Bills' },
    { value: 'COFFEE', label: '☕ Coffee' },
    { value: 'OTHER', label: '📦 Other' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusLabel(b: EnrichedBudget): string {
    if (b.isOverBudget) return 'Over budget';
    if (b.isWarning) return `${b.pct}% used — watch it`;
    return `${b.pct}% used`;
}

function statusBarColor(b: EnrichedBudget): string {
    if (b.isOverBudget) return 'bg-error';
    if (b.isWarning) return 'bg-[#ff8800]';
    return 'bg-primary';
}

function statusBadgeCls(b: EnrichedBudget): string {
    if (b.isOverBudget) return 'bg-error-container text-on-error-container border-error';
    if (b.isWarning) return 'bg-[#fff3cd] text-[#7d4e00] border-[#ff8800]';
    return 'bg-primary-container text-on-primary-container border-inverse-surface/30';
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function BudgetSkeleton() {
    return (
        <div className="bg-white border-4 border-inverse-surface p-5 space-y-3 animate-pulse">
            <div className="flex justify-between items-start">
                <div className="h-5 w-32 bg-surface-container" />
                <div className="h-5 w-20 bg-surface-container" />
            </div>
            <div className="h-3 w-full bg-surface-container" />
            <div className="h-2.5 w-full bg-surface-container" />
        </div>
    );
}

// ── OverallBudgetCard ──────────────────────────────────────────────────────────

function OverallBudgetCard({
    budget,
    currency,
    onDelete,
}: {
    budget: EnrichedBudget;
    currency: string;
    onDelete: () => void;
}) {
    const remaining = Math.max(budget.amount - budget.spent, 0);
    const overBy = Math.max(budget.spent - budget.amount, 0);
    const clampPct = Math.min(budget.pct, 100);

    const spentDisplay = useCountUp({
        to: budget.spent,
        duration: 900,
        delay: 100,
        enabled: budget.spent > 0,
        format: (n) => formatMoney(n, currency),
    });

    return (
        <motion.div
            variants={itemVariants}
            layout
            className={[
                'border-4 border-inverse-surface p-6 hard-shadow-lg relative overflow-hidden',
                budget.isOverBudget
                    ? 'bg-error-container'
                    : budget.isWarning
                        ? 'bg-[#fff8e1]'
                        : 'bg-primary-container',
            ].join(' ')}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                <div>
                    <span className="font-headline font-black text-[10px] uppercase tracking-[0.25em] opacity-60">
                        Overall Monthly Budget
                    </span>
                    <h3 className="font-headline font-black text-2xl uppercase leading-tight mt-0.5">
                        {budget.name}
                    </h3>
                </div>
                <span className={`text-[10px] font-black px-2 py-1 border uppercase tracking-wider shrink-0 ${statusBadgeCls(budget)}`}>
                    {statusLabel(budget)}
                </span>
            </div>

            {/* Big numbers — spent count-up animated */}
            <div className="flex items-baseline gap-3 flex-wrap mb-5 mt-4">
                <span className="font-headline font-black text-5xl leading-none tracking-tighter tabular-nums">
                    {spentDisplay}
                </span>
                <span className="font-headline font-bold text-xl opacity-50">
                    / {formatMoney(budget.amount, currency)}
                </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-4 bg-black/10 border-2 border-inverse-surface/20 overflow-hidden mb-3">
                <motion.div
                    className={`h-full ${statusBarColor(budget)} border-r-2 border-inverse-surface/20`}
                    initial={{ width: 0 }}
                    animate={{ width: `${clampPct}%` }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                />
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center flex-wrap gap-2">
                <p className="text-xs font-bold opacity-70">
                    {budget.isOverBudget
                        ? `Over by ${formatMoney(overBy, currency)} this month`
                        : `${formatMoney(remaining, currency)} remaining this month`}
                </p>
                <button
                    onClick={onDelete}
                    className="text-[10px] font-black uppercase text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                >
                    Remove
                </button>
            </div>

            {/* Decorative pct */}
            <div className="absolute right-4 bottom-[-8px] font-headline font-black text-[80px] leading-none opacity-[0.07] pointer-events-none select-none">
                {budget.pct}%
            </div>
        </motion.div>
    );
}

// ── CategoryBudgetCard ─────────────────────────────────────────────────────────

function CategoryBudgetCard({
    budget,
    currency,
    onDelete,
}: {
    budget: EnrichedBudget;
    currency: string;
    onDelete: () => void;
}) {
    const meta = CATEGORY_META[budget.category ?? ''] ?? CATEGORY_META.OTHER;
    const remaining = Math.max(budget.amount - budget.spent, 0);
    const overBy = Math.max(budget.spent - budget.amount, 0);
    const clampPct = Math.min(budget.pct, 100);

    return (
        <motion.div
            variants={itemVariants}
            layout
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
            className="bg-white border-4 border-inverse-surface hard-shadow p-5"
        >
            {/* Top row */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="text-2xl shrink-0">{meta.emoji}</div>
                    <div className="min-w-0">
                        <p className="font-headline font-black text-base uppercase truncate leading-tight">
                            {budget.name}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mt-0.5">
                            {meta.label} · {budget.period.toLowerCase()}
                        </p>
                    </div>
                </div>
                <span className={`text-[9px] font-black px-1.5 py-0.5 border uppercase shrink-0 ${statusBadgeCls(budget)}`}>
                    {budget.isOverBudget ? 'Over' : budget.isWarning ? 'Warning' : 'On track'}
                </span>
            </div>

            {/* Spend vs limit */}
            <div className="flex justify-between items-baseline mb-2">
                <span className={`font-headline font-black text-xl ${budget.isOverBudget ? 'text-error' : ''}`}>
                    {formatCompactMoney(budget.spent, currency)}
                </span>
                <span className="font-headline font-bold text-sm text-on-surface-variant">
                    / {formatCompactMoney(budget.amount, currency)}
                </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-surface-container border border-inverse-surface/20 overflow-hidden mb-2">
                <motion.div
                    className={`h-full ${statusBarColor(budget)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${clampPct}%` }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                />
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center mt-2">
                <p className="text-[10px] font-bold text-on-surface-variant">
                    {budget.isOverBudget
                        ? `Over by ${formatCompactMoney(overBy, currency)}`
                        : `${formatCompactMoney(remaining, currency)} left`}
                </p>
                <button
                    onClick={onDelete}
                    className="text-[10px] font-black uppercase text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                >
                    Remove
                </button>
            </div>
        </motion.div>
    );
}

// ── BudgetsPage ────────────────────────────────────────────────────────────────

export default function BudgetsPage() {
    const currency = useAppStore((s) => s.currency);
    const showToast = useAppStore((s) => s.showToast);
    const [modal, setModal] = useState<ModalConfig | null>(null);

    const { data: budgets = [], isLoading } = useBudgets();
    const createBudget = useCreateBudget();
    const deleteBudget = useDeleteBudget();

    const overallBudgets = budgets.filter((b) => b.scope === 'OVERALL');
    const categoryBudgets = budgets.filter((b) => b.scope === 'CATEGORY');

    // Aggregate stats
    const totalLimit = budgets.reduce((s, b) => s + b.amount, 0);
    const totalSpent = overallBudgets.length > 0
        ? overallBudgets[0].spent
        : budgets.reduce((s, b) => s + b.spent, 0);
    const overallPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
    const anyOverBudget = budgets.some((b) => b.isOverBudget);
    const anyWarning = budgets.some((b) => b.isWarning);

    // Count-up animated summary numbers
    const totalLimitDisplay = useCountUp({
        to: totalLimit,
        duration: 800,
        enabled: !isLoading && budgets.length > 0,
        format: (n) => formatCompactMoney(n, currency),
    });
    const totalSpentDisplay = useCountUp({
        to: totalSpent,
        duration: 800,
        delay: 60,
        enabled: !isLoading && budgets.length > 0,
        format: (n) => formatCompactMoney(n, currency),
    });

    // ── Modals ─────────────────────────────────────────────────────────────

    function openCreateBudget() {
        setModal({
            title: 'New Budget',
            subtitle: 'Set a spending limit to track.',
            submitLabel: 'Create Budget',
            fields: [
                {
                    name: 'name',
                    label: 'Budget name',
                    type: 'text',
                    placeholder: 'Monthly Limit',
                    required: true,
                },
                {
                    name: 'scope',
                    label: 'Budget scope',
                    type: 'select',
                    value: 'CATEGORY',
                    options: [
                        { value: 'OVERALL', label: '🌍 Overall monthly spend' },
                        { value: 'CATEGORY', label: '📂 Specific category' },
                    ],
                },
                {
                    name: 'category',
                    label: 'Category (if category budget)',
                    type: 'select',
                    value: 'FOOD',
                    options: CATEGORY_OPTIONS,
                },
                {
                    name: 'amount',
                    label: `Monthly limit (${currency})`,
                    type: 'number',
                    step: '0.01',
                    min: '0.01',
                    placeholder: '500.00',
                    required: true,
                    inputmode: 'decimal',
                },
                {
                    name: 'alertThresholdPct',
                    label: 'Warn me when I reach (%)',
                    type: 'number',
                    value: '80',
                    min: '1',
                    max: '100',
                    placeholder: '80',
                },
            ],
            onSubmit: (values) => {
                const name = values.name?.trim();
                const amount = Number(values.amount);

                if (!name) {
                    showToast('Budget name is required.', 'error');
                    return false;
                }
                if (!Number.isFinite(amount) || amount <= 0) {
                    showToast('Enter a valid amount.', 'error');
                    return false;
                }

                const body: Record<string, unknown> = {
                    name,
                    scope: values.scope || 'CATEGORY',
                    amount,
                    period: 'MONTHLY',
                    startDay: 1,
                    alertThresholdPct: Number(values.alertThresholdPct || 80),
                };

                if (values.scope === 'CATEGORY') {
                    body.category = values.category || 'FOOD';
                }

                createBudget.mutate(body, {
                    onSuccess: () => showToast(`${name} budget created! ✓`, 'success'),
                    onError: () => showToast('Failed to create budget.', 'error'),
                });
                return true;
            },
        });
    }

    function handleDelete(id: string, name: string) {
        deleteBudget.mutate(id, {
            onSuccess: () => showToast(`${name} removed.`, 'info'),
            onError: () => showToast('Failed to remove budget.', 'error'),
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
                {/* ── Header ──────────────────────────────────────────────────── */}
                <motion.div
                    variants={itemVariants}
                    className="flex justify-between items-start gap-4 flex-wrap"
                >
                    <div>
                        <h1 className="font-headline text-5xl font-black uppercase italic tracking-tighter leading-none">
                            BUDGETS
                        </h1>
                        <p className="font-bold text-on-surface-variant text-sm mt-1 uppercase tracking-wider">
                            {isLoading
                                ? 'Loading budgets...'
                                : anyOverBudget
                                    ? '🔴 One or more budgets exceeded.'
                                    : anyWarning
                                        ? '⚠️ Approaching budget limits.'
                                        : budgets.length > 0
                                            ? `${budgets.length} active budget${budgets.length !== 1 ? 's' : ''}.`
                                            : 'No budgets set.'}
                        </p>
                    </div>
                    <button
                        onClick={openCreateBudget}
                        className="interactive-lift bg-primary-container border-4 border-inverse-surface px-5 py-3 hard-shadow flex items-center gap-2 cursor-pointer shrink-0"
                    >
                        <span className="material-symbols-outlined text-xl leading-none">add</span>
                        <span className="font-headline font-black text-sm uppercase">Add Budget</span>
                    </button>
                </motion.div>

                {/* ── Summary stats ───────────────────────────────────────────── */}
                {!isLoading && budgets.length > 0 && (
                    <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Budgets', value: String(budgets.length) },
                            { label: 'Total Limit', value: totalLimitDisplay },
                            { label: 'Total Spent', value: totalSpentDisplay },
                        ].map((s) => (
                            <div
                                key={s.label}
                                className="bg-white border-4 border-inverse-surface hard-shadow p-4 text-center"
                            >
                                <div className="font-headline font-black text-xl">{s.value}</div>
                                <div className="font-bold text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* ── Skeleton ────────────────────────────────────────────────── */}
                {isLoading && (
                    <div className="space-y-4">
                        <BudgetSkeleton />
                        <div className="grid grid-cols-1 gap-4">
                            {[0, 1].map((i) => <BudgetSkeleton key={i} />)}
                        </div>
                    </div>
                )}

                {/* ── Overall budget (featured) ────────────────────────────────── */}
                {!isLoading && overallBudgets.length > 0 && (
                    <motion.section variants={itemVariants} className="space-y-3">
                        <h2 className="font-headline font-black text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                            Overall Budget
                        </h2>
                        <AnimatePresence mode="popLayout">
                            {overallBudgets.map((b) => (
                                <OverallBudgetCard
                                    key={b.id}
                                    budget={b}
                                    currency={currency}
                                    onDelete={() => handleDelete(b.id, b.name)}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.section>
                )}

                {/* ── Category budgets ────────────────────────────────────────── */}
                {!isLoading && categoryBudgets.length > 0 && (
                    <motion.section variants={itemVariants} className="space-y-3">
                        <h2 className="font-headline font-black text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                            Category Budgets
                        </h2>
                        <AnimatePresence mode="popLayout">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {categoryBudgets.map((b) => (
                                    <CategoryBudgetCard
                                        key={b.id}
                                        budget={b}
                                        currency={currency}
                                        onDelete={() => handleDelete(b.id, b.name)}
                                    />
                                ))}
                            </div>
                        </AnimatePresence>
                    </motion.section>
                )}

                {/* ── Empty state ──────────────────────────────────────────────── */}
                {!isLoading && budgets.length === 0 && (
                    <motion.div
                        variants={itemVariants}
                        className="border-4 border-dashed border-inverse-surface p-12 text-center"
                    >
                        <div className="text-5xl mb-4">🎯</div>
                        <p className="font-headline font-black text-2xl uppercase mb-2">No Budgets Set</p>
                        <p className="font-bold text-on-surface-variant text-sm max-w-xs mx-auto leading-relaxed mb-6">
                            Set spending limits to know exactly when to pump the brakes.
                        </p>
                        <button
                            onClick={openCreateBudget}
                            className="interactive-lift bg-primary-container border-4 border-inverse-surface px-6 py-3 hard-shadow font-headline font-black text-sm uppercase cursor-pointer"
                        >
                            + Set Your First Budget
                        </button>
                    </motion.div>
                )}
            </motion.main>

            <ActionModal config={modal} onClose={() => setModal(null)} />
        </>
    );
}