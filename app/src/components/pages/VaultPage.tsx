'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app';
import { formatMoney, displayToUsd } from '@/lib/currencies';
import ActionModal from '@/components/ui/ActionModal';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Account {
    id: string;
    name: string;
    type: string;
    description: string | null;
    openingBalance: number;
    currentBalance: number;
    currency: string;
    colorTheme: string | null;
    icon: string | null;
    isArchived: boolean;
    createdAt: string;
    updatedAt: string;
}

interface Transaction {
    id: string;
    merchant: string;
    amount: number;
    type: string;
    category: string;
    occurredAt: string;
    createdAt: string;
}

type ModalConfig = React.ComponentProps<typeof ActionModal>['config'];

// Transfer wizard steps
type TransferStep = 1 | 2 | 3;

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCOUNT_TYPES = [
    { value: 'CASH', label: '💵 Cash', icon: 'payments' },
    { value: 'WALLET', label: '💳 Digital Wallet', icon: 'account_balance_wallet' },
    { value: 'SAVINGS', label: '🛡️ Savings', icon: 'shield' },
    { value: 'SPENDING', label: '🛍️ Spending', icon: 'shopping_bag' },
    { value: 'CREDIT_CARD_MANUAL', label: '💳 Credit Card', icon: 'credit_card' },
    { value: 'SHARED_POOL', label: '🤝 Shared Pool', icon: 'group' },
    { value: 'EMERGENCY_FUND', label: '🚨 Emergency Fund', icon: 'security' },
    { value: 'OTHER', label: '📦 Other', icon: 'category' },
];

// Default colors for new accounts — shown as a visual color picker
const PRESET_COLORS = [
    { hex: '#CAFD00', label: 'Lime' },
    { hex: '#FFBDF3', label: 'Pink' },
    { hex: '#BBA2FF', label: 'Purple' },
    { hex: '#FFD966', label: 'Gold' },
    { hex: '#A8EDEA', label: 'Mint' },
    { hex: '#FFB347', label: 'Orange' },
    { hex: '#B5EAD7', label: 'Sage' },
    { hex: '#FFFFFF', label: 'White' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAccountIcon(account: Account): string {
    if (account.icon) return account.icon;
    return ACCOUNT_TYPES.find((t) => t.value === account.type)?.icon ?? 'account_balance_wallet';
}

function getAccountTypeLabel(type: string): string {
    return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
}

// Determine whether to use dark or light text on a given hex background
function usesDarkText(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // Perceived luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AccountCardSkeleton() {
    return (
        <div className="h-40 border-4 border-inverse-surface bg-surface-container animate-pulse shrink-0 w-64 md:w-auto" />
    );
}

// ─── AccountCard ──────────────────────────────────────────────────────────────

function AccountCard({
    account,
    currency,
    onClick,
}: {
    account: Account;
    currency: string;
    onClick: () => void;
}) {
    const bg = account.colorTheme || '#CAFD00';
    const darkText = usesDarkText(bg);
    const textColor = darkText ? 'text-[#0c0f0f]' : 'text-white';
    const borderColor = darkText ? 'border-[#0c0f0f]/30' : 'border-white/30';
    const icon = getAccountIcon(account);

    return (
        <motion.button
            onClick={onClick}
            whileHover={{ rotate: 1, y: -4 }}
            whileTap={{ scale: 0.97, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="relative h-40 w-full border-4 border-inverse-surface hard-shadow cursor-pointer text-left overflow-hidden shrink-0 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            style={{ backgroundColor: bg }}
            aria-label={`${account.name}: ${formatMoney(account.currentBalance, currency as any)}`}
        >
            {/* Top row: icon + type badge */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                <div className={`border-2 ${borderColor} p-2`}>
                    <span
                        className={`material-symbols-outlined text-xl leading-none ${textColor}`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        {icon}
                    </span>
                </div>
                <span
                    className={`font-headline font-black text-[9px] uppercase tracking-[0.2em] ${textColor} opacity-70`}
                >
                    {account.type.replace('_', ' ')}
                </span>
            </div>

            {/* Bottom row: name + balance */}
            <div className="absolute bottom-4 left-4 right-4">
                <p className={`font-headline font-black text-base uppercase leading-tight truncate ${textColor}`}>
                    {account.name}
                </p>
                <p className={`font-headline font-black text-3xl leading-none mt-1 ${textColor}`}>
                    {formatMoney(account.currentBalance, currency as any)}
                </p>
            </div>

            {/* Subtle card chip decoration */}
            <div
                className={`absolute top-[52px] left-4 w-8 h-6 border-2 ${borderColor} opacity-40`}
                aria-hidden="true"
            />
        </motion.button>
    );
}

// ─── TransferWizard ───────────────────────────────────────────────────────────

function TransferWizard({
    accounts,
    currency,
    onClose,
    onSuccess,
}: {
    accounts: Account[];
    currency: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const showToast = useAppStore((s) => s.showToast);
    const qc = useQueryClient();

    const [step, setStep] = useState<TransferStep>(1);
    const [fromId, setFromId] = useState<string>('');
    const [toId, setToId] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [note, setNote] = useState<string>('');

    const fromAccount = accounts.find((a) => a.id === fromId);
    const toAccount = accounts.find((a) => a.id === toId);

    const transfer = useMutation({
        mutationFn: (body: object) =>
            fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ _action: 'transfer', ...body }),
            }).then((r) => r.json()),
        onSuccess: (res) => {
            if (!res.success) {
                showToast(res.error || 'Transfer failed.', 'error');
                return;
            }
            qc.invalidateQueries({ queryKey: ['accounts'] });
            qc.invalidateQueries({ queryKey: ['transactions'] });
            qc.invalidateQueries({ queryKey: ['stats'] });
            showToast('Transfer complete! ✓', 'success');
            onSuccess();
        },
        onError: () => showToast('Transfer failed.', 'error'),
    });

    const handleTransfer = () => {
        const amt = parseFloat(amount);
        if (!fromId || !toId || fromId === toId) {
            showToast('Select two different accounts.', 'error');
            return;
        }
        if (!Number.isFinite(amt) || amt <= 0) {
            showToast('Enter a valid amount.', 'error');
            return;
        }
        transfer.mutate({ fromAccountId: fromId, toAccountId: toId, amount: amt, note: note || undefined });
    };

    const STEP_LABELS = ['From', 'To & Amount', 'Confirm'];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
        >
            {/* Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/55"
                onClick={onClose}
            />

            {/* Panel */}
            <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                className="relative z-10 w-full sm:max-w-md bg-white dark:bg-[#161d22] border-4 border-inverse-surface hard-shadow-lg max-h-[90dvh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b-4 border-inverse-surface bg-tertiary-container shrink-0">
                    <div>
                        <h3 className="font-headline font-black text-2xl uppercase">Transfer</h3>
                        <p className="font-bold text-xs uppercase tracking-wider text-on-surface-variant mt-0.5">
                            Step {step} of 3 — {STEP_LABELS[step - 1]}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="material-symbols-outlined text-2xl hover:rotate-90 transition-transform cursor-pointer"
                        aria-label="Close transfer"
                    >
                        close
                    </button>
                </div>

                {/* Step progress bar */}
                <div className="flex h-1.5 shrink-0">
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            className={`flex-1 transition-colors duration-300 ${s <= step ? 'bg-tertiary' : 'bg-surface-container'
                                }`}
                        />
                    ))}
                </div>

                {/* Step content */}
                <div className="flex-1 overflow-y-auto p-5 min-h-0">
                    <AnimatePresence mode="wait">
                        {/* Step 1: Pick source account */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.18 }}
                                className="space-y-3"
                            >
                                <p className="font-headline font-black text-sm uppercase tracking-wider text-on-surface-variant mb-4">
                                    Which account are you moving money from?
                                </p>
                                {accounts.map((acc) => {
                                    const bg = acc.colorTheme || '#CAFD00';
                                    const darkText = usesDarkText(bg);
                                    const textColor = darkText ? 'text-[#0c0f0f]' : 'text-white';
                                    const selected = fromId === acc.id;
                                    return (
                                        <button
                                            key={acc.id}
                                            onClick={() => setFromId(acc.id)}
                                            className={[
                                                'w-full flex items-center gap-4 p-4 border-4 transition-all cursor-pointer text-left',
                                                selected
                                                    ? 'border-inverse-surface hard-shadow -translate-x-1 -translate-y-1'
                                                    : 'border-inverse-surface/40 hover:border-inverse-surface',
                                            ].join(' ')}
                                            style={{ backgroundColor: selected ? bg : undefined }}
                                        >
                                            <span
                                                className={`material-symbols-outlined text-2xl ${selected ? textColor : ''}`}
                                                style={{ fontVariationSettings: "'FILL' 1" }}
                                            >
                                                {getAccountIcon(acc)}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-headline font-black text-sm uppercase truncate ${selected ? textColor : ''}`}>
                                                    {acc.name}
                                                </p>
                                                <p className={`text-xs font-bold ${selected ? textColor : 'text-on-surface-variant'} opacity-70`}>
                                                    {formatMoney(acc.currentBalance, currency as any)}
                                                </p>
                                            </div>
                                            {selected && (
                                                <span className={`material-symbols-outlined text-lg ${textColor}`}>
                                                    check_circle
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </motion.div>
                        )}

                        {/* Step 2: Pick destination + amount */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.18 }}
                                className="space-y-5"
                            >
                                <div>
                                    <p className="font-headline font-black text-sm uppercase tracking-wider text-on-surface-variant mb-3">
                                        Where is it going?
                                    </p>
                                    <div className="space-y-2">
                                        {accounts
                                            .filter((a) => a.id !== fromId)
                                            .map((acc) => {
                                                const bg = acc.colorTheme || '#CAFD00';
                                                const darkText = usesDarkText(bg);
                                                const textColor = darkText ? 'text-[#0c0f0f]' : 'text-white';
                                                const selected = toId === acc.id;
                                                return (
                                                    <button
                                                        key={acc.id}
                                                        onClick={() => setToId(acc.id)}
                                                        className={[
                                                            'w-full flex items-center gap-4 p-4 border-4 transition-all cursor-pointer text-left',
                                                            selected
                                                                ? 'border-inverse-surface hard-shadow -translate-x-1 -translate-y-1'
                                                                : 'border-inverse-surface/40 hover:border-inverse-surface',
                                                        ].join(' ')}
                                                        style={{ backgroundColor: selected ? bg : undefined }}
                                                    >
                                                        <span
                                                            className={`material-symbols-outlined text-2xl ${selected ? textColor : ''}`}
                                                            style={{ fontVariationSettings: "'FILL' 1" }}
                                                        >
                                                            {getAccountIcon(acc)}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`font-headline font-black text-sm uppercase truncate ${selected ? textColor : ''}`}>
                                                                {acc.name}
                                                            </p>
                                                            <p className={`text-xs font-bold ${selected ? textColor : 'text-on-surface-variant'} opacity-70`}>
                                                                {formatMoney(acc.currentBalance, currency as any)}
                                                            </p>
                                                        </div>
                                                        {selected && (
                                                            <span className={`material-symbols-outlined text-lg ${textColor}`}>
                                                                check_circle
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-headline font-black text-xs uppercase tracking-widest text-on-surface-variant mb-2">
                                        Amount ({currency}) *
                                    </label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0.01"
                                        inputMode="decimal"
                                        className="w-full border-2 border-inverse-surface bg-white dark:bg-[#1d252b] dark:text-white px-3 py-3 font-bold text-sm hard-shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                                    />
                                </div>

                                <div>
                                    <label className="block font-headline font-black text-xs uppercase tracking-widest text-on-surface-variant mb-2">
                                        Note (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Rent contribution, savings top-up…"
                                        className="w-full border-2 border-inverse-surface bg-white dark:bg-[#1d252b] dark:text-white px-3 py-3 font-bold text-sm hard-shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Confirm */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.18 }}
                                className="space-y-4"
                            >
                                <p className="font-headline font-black text-sm uppercase tracking-wider text-on-surface-variant">
                                    Confirm your transfer
                                </p>

                                {/* Summary card */}
                                <div className="bg-surface-container border-4 border-inverse-surface p-5 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 border-2 border-inverse-surface flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: fromAccount?.colorTheme || '#CAFD00' }}
                                        >
                                            <span
                                                className="material-symbols-outlined text-base"
                                                style={{ fontVariationSettings: "'FILL' 1" }}
                                            >
                                                {fromAccount ? getAccountIcon(fromAccount) : 'payments'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-headline font-black text-xs uppercase opacity-60">From</p>
                                            <p className="font-headline font-black text-base truncate">{fromAccount?.name}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pl-2">
                                        <span className="material-symbols-outlined text-2xl text-on-surface-variant">arrow_downward</span>
                                        <p className="font-headline font-black text-3xl text-primary-dim">
                                            {formatMoney(parseFloat(amount) || 0, currency as any)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 border-2 border-inverse-surface flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: toAccount?.colorTheme || '#BBA2FF' }}
                                        >
                                            <span
                                                className="material-symbols-outlined text-base"
                                                style={{ fontVariationSettings: "'FILL' 1" }}
                                            >
                                                {toAccount ? getAccountIcon(toAccount) : 'savings'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-headline font-black text-xs uppercase opacity-60">To</p>
                                            <p className="font-headline font-black text-base truncate">{toAccount?.name}</p>
                                        </div>
                                    </div>

                                    {note && (
                                        <p className="text-sm font-bold text-on-surface-variant border-t-2 border-inverse-surface/20 pt-3 italic">
                                            "{note}"
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer actions */}
                <div className="px-5 pb-5 pt-3 grid grid-cols-2 gap-3 border-t-2 border-inverse-surface shrink-0">
                    <button
                        onClick={step === 1 ? onClose : () => setStep((s) => (s - 1) as TransferStep)}
                        className="border-2 border-inverse-surface py-3 font-headline font-black uppercase text-xs hover:bg-surface-container transition-colors cursor-pointer"
                    >
                        {step === 1 ? 'Cancel' : '← Back'}
                    </button>
                    {step < 3 ? (
                        <button
                            onClick={() => {
                                if (step === 1 && !fromId) { showToast('Pick a source account.', 'error'); return; }
                                if (step === 2 && !toId) { showToast('Pick a destination account.', 'error'); return; }
                                if (step === 2 && (!amount || parseFloat(amount) <= 0)) {
                                    showToast('Enter a valid amount.', 'error'); return;
                                }
                                setStep((s) => (s + 1) as TransferStep);
                            }}
                            className="bg-tertiary-container border-2 border-inverse-surface py-3 font-headline font-black uppercase text-xs hard-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                        >
                            Next →
                        </button>
                    ) : (
                        <button
                            onClick={handleTransfer}
                            disabled={transfer.isPending}
                            className="bg-primary-container border-2 border-inverse-surface py-3 font-headline font-black uppercase text-xs hard-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {transfer.isPending ? 'Moving…' : 'Confirm ✓'}
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── AccountDetailSheet ───────────────────────────────────────────────────────

function AccountDetailSheet({
    account,
    currency,
    onClose,
    onArchive,
}: {
    account: Account;
    currency: string;
    onClose: () => void;
    onArchive: (id: string) => void;
}) {
    const bg = account.colorTheme || '#CAFD00';
    const darkText = usesDarkText(bg);
    const textColor = darkText ? 'text-[#0c0f0f]' : 'text-white';

    const { data: txData } = useQuery<{ items: Transaction[]; total: number }>({
        queryKey: ['transactions', { accountId: account.id, limit: '5' }],
        queryFn: () =>
            fetch(`/api/transactions?accountId=${account.id}&limit=5`)
                .then((r) => r.json())
                .then((d) => d.data),
    });
    const recentTx = txData?.items ?? [];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end justify-center"
        >
            <motion.div
                className="absolute inset-0 bg-black/55"
                onClick={onClose}
            />
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                className="relative z-10 w-full max-w-lg bg-white dark:bg-[#161d22] border-4 border-b-0 border-inverse-surface hard-shadow-lg max-h-[85dvh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-10 h-1 bg-inverse-surface/20 rounded-full" />
                </div>

                {/* Account hero */}
                <div
                    className="mx-4 mb-4 p-5 border-4 border-inverse-surface relative overflow-hidden shrink-0"
                    style={{ backgroundColor: bg }}
                >
                    <div className="flex justify-between items-start mb-8">
                        <span
                            className={`material-symbols-outlined text-3xl ${textColor}`}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            {getAccountIcon(account)}
                        </span>
                        <span className={`font-headline font-black text-[9px] uppercase tracking-[0.2em] ${textColor} opacity-70`}>
                            {account.type.replace(/_/g, ' ')}
                        </span>
                    </div>
                    <p className={`font-headline font-black text-4xl leading-none ${textColor}`}>
                        {formatMoney(account.currentBalance, currency as any)}
                    </p>
                    <p className={`font-headline font-black text-base uppercase mt-1 ${textColor} opacity-80`}>
                        {account.name}
                    </p>
                    {account.description && (
                        <p className={`text-xs font-bold mt-2 ${textColor} opacity-60 leading-relaxed`}>
                            {account.description}
                        </p>
                    )}
                    {/* Card chip */}
                    <div className={`absolute top-[52px] left-5 w-8 h-6 border-2 ${darkText ? 'border-black/20' : 'border-white/20'} opacity-40`} />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 px-4 mb-4 shrink-0">
                    <div className="bg-surface-container border-2 border-inverse-surface p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Opening Balance</p>
                        <p className="font-headline font-black text-lg mt-0.5">
                            {formatMoney(account.openingBalance, currency as any)}
                        </p>
                    </div>
                    <div className="bg-surface-container border-2 border-inverse-surface p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Net Change</p>
                        <p className={`font-headline font-black text-lg mt-0.5 ${account.currentBalance >= account.openingBalance ? 'text-primary-dim' : 'text-error'
                            }`}>
                            {account.currentBalance >= account.openingBalance ? '+' : ''}
                            {formatMoney(account.currentBalance - account.openingBalance, currency as any)}
                        </p>
                    </div>
                </div>

                {/* Recent transactions */}
                <div className="flex-1 overflow-y-auto px-4 min-h-0">
                    <h4 className="font-headline font-black text-xs uppercase tracking-widest text-on-surface-variant mb-3">
                        Recent Activity
                    </h4>
                    {recentTx.length === 0 ? (
                        <p className="text-sm font-bold text-on-surface-variant text-center py-6">
                            No transactions yet.
                        </p>
                    ) : (
                        <div className="space-y-2 pb-4">
                            {recentTx.map((tx) => {
                                const isIncome = tx.type === 'INCOME';
                                return (
                                    <div
                                        key={tx.id}
                                        className="flex items-center gap-3 bg-surface-container border-2 border-inverse-surface p-3"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-headline font-black text-sm uppercase truncate">{tx.merchant}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-wide opacity-50 mt-0.5">
                                                {formatDate(tx.occurredAt)} · {tx.category}
                                            </p>
                                        </div>
                                        <p className={`font-headline font-black text-base shrink-0 ${isIncome ? 'text-primary-dim' : 'text-error'}`}>
                                            {isIncome ? '+' : '−'}{formatMoney(tx.amount, currency as any)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 pb-5 pt-3 border-t-2 border-inverse-surface flex gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 border-2 border-inverse-surface py-3 font-headline font-black uppercase text-xs hover:bg-surface-container transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => onArchive(account.id)}
                        className="border-2 border-error text-error px-4 py-3 font-headline font-black uppercase text-xs hover:bg-error hover:text-white transition-all cursor-pointer"
                    >
                        Archive
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── VaultPage ────────────────────────────────────────────────────────────────

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
} as const;

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 24 } },
} as const;

export default function VaultPage() {
    const currency = useAppStore((s) => s.currency);
    const showToast = useAppStore((s) => s.showToast);
    const qc = useQueryClient();

    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [showTransfer, setShowTransfer] = useState(false);
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].hex);
    const [modal, setModal] = useState<ModalConfig | null>(null);

    const { data, isLoading } = useQuery<{ accounts: Account[] }>({
        queryKey: ['accounts'],
        queryFn: () =>
            fetch('/api/accounts').then((r) => r.json()).then((d) => d.data),
    });
    const accounts = data?.accounts ?? [];

    const totalBalance = accounts.reduce((s, a) => s + a.currentBalance, 0);

    // ── Mutations ──────────────────────────────────────────────────────────

    const createAccount = useMutation({
        mutationFn: (body: object) =>
            fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }).then((r) => r.json()),
        onSuccess: (res) => {
            if (!res.success) { showToast(res.error || 'Failed to create account.', 'error'); return; }
            qc.invalidateQueries({ queryKey: ['accounts'] });
            qc.invalidateQueries({ queryKey: ['stats'] });
            showToast('Account created! ✓', 'success');
        },
        onError: () => showToast('Failed to create account.', 'error'),
    });

    const archiveAccount = useMutation({
        mutationFn: (id: string) =>
            fetch(`/api/accounts/${id}`, { method: 'DELETE' }).then((r) => r.json()),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['accounts'] });
            qc.invalidateQueries({ queryKey: ['stats'] });
            setSelectedAccount(null);
            showToast('Account archived.', 'info');
        },
        onError: () => showToast('Failed to archive account.', 'error'),
    });

    // ── Modal openers ──────────────────────────────────────────────────────

    const openCreateAccount = useCallback(() => {
        setSelectedColor(PRESET_COLORS[0].hex);
        setModal({
            title: 'New Account',
            subtitle: 'Add a wallet, stash, or cash pool.',
            submitLabel: 'Create Account',
            fields: [
                {
                    name: 'name',
                    label: 'Account name',
                    type: 'text',
                    placeholder: 'Main Wallet',
                    required: true,
                },
                {
                    name: 'type',
                    label: 'Account type',
                    type: 'select',
                    value: 'WALLET',
                    options: ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label })),
                },
                {
                    name: 'description',
                    label: 'Description (optional)',
                    type: 'text',
                    placeholder: 'Primary debit card and online spending.',
                },
                {
                    name: 'openingBalance',
                    label: `Opening balance (${currency})`,
                    type: 'number',
                    step: '0.01',
                    min: '0',
                    value: '0',
                    placeholder: '0.00',
                    inputmode: 'decimal',
                },
                {
                    name: 'colorTheme',
                    label: 'Card color',
                    type: 'select',
                    value: PRESET_COLORS[0].hex,
                    options: PRESET_COLORS.map((c) => ({ value: c.hex, label: c.label })),
                },
            ],
            onSubmit: (values) => {
                const name = values.name?.trim();
                if (!name) { showToast('Account name is required.', 'error'); return false; }

                createAccount.mutate({
                    name,
                    type: values.type || 'WALLET',
                    description: values.description?.trim() || undefined,
                    openingBalance: Number(values.openingBalance || 0),
                    colorTheme: values.colorTheme || PRESET_COLORS[0].hex,
                    icon: ACCOUNT_TYPES.find((t) => t.value === values.type)?.icon,
                });
                return true;
            },
        });
    }, [currency, showToast, createAccount]);

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <>
            <motion.main
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="max-w-3xl mx-auto pb-8"
            >
                {/* ── Hero: net balance ──────────────────────────────────────────── */}
                <motion.section
                    variants={itemVariants}
                    className="bg-inverse-surface text-white px-6 pt-8 pb-6 relative overflow-hidden"
                >
                    <p className="font-headline font-bold text-[10px] uppercase tracking-[0.3em] opacity-50 mb-2">
                        Total Net Balance
                    </p>
                    <p className="font-headline font-black text-6xl sm:text-7xl leading-none tracking-tighter">
                        {isLoading
                            ? <span className="inline-block w-48 h-14 bg-white/10 animate-pulse" />
                            : formatMoney(totalBalance, currency)}
                    </p>
                    <p className="font-bold text-sm opacity-50 mt-3 uppercase tracking-wider">
                        {isLoading ? '…' : `Across ${accounts.length} account${accounts.length !== 1 ? 's' : ''}`}
                    </p>

                    {/* Transfer + Add buttons */}
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => setShowTransfer(true)}
                            disabled={accounts.length < 2}
                            className="flex items-center gap-2 border-2 border-white/40 px-4 py-2.5 font-headline font-black text-xs uppercase hover:bg-white hover:text-inverse-surface transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-base leading-none">swap_horiz</span>
                            Transfer
                        </button>
                        <button
                            onClick={openCreateAccount}
                            className="flex items-center gap-2 bg-[#cafd00] text-inverse-surface border-2 border-white/0 px-4 py-2.5 font-headline font-black text-xs uppercase hard-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-base leading-none">add</span>
                            New Account
                        </button>
                    </div>

                    {/* Decorative icon */}
                    <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.04] pointer-events-none rotate-12">
                        <span className="material-symbols-outlined text-[200px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            account_balance
                        </span>
                    </div>
                </motion.section>

                {/* ── Account cards ──────────────────────────────────────────────── */}
                <motion.section variants={itemVariants} className="px-6 pt-6">
                    <h2 className="font-headline font-black text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-4">
                        Your Accounts
                    </h2>

                    {isLoading ? (
                        /* Skeleton grid */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[0, 1, 2].map((i) => <AccountCardSkeleton key={i} />)}
                        </div>
                    ) : accounts.length === 0 ? (
                        /* Empty state */
                        <div className="border-4 border-dashed border-inverse-surface p-12 text-center">
                            <div className="text-5xl mb-4">🏦</div>
                            <p className="font-headline font-black text-2xl uppercase mb-2">No Accounts Yet</p>
                            <p className="font-bold text-on-surface-variant text-sm mb-6">
                                Add your cash, wallets, and savings to see everything in one place.
                            </p>
                            <button
                                onClick={openCreateAccount}
                                className="interactive-lift bg-primary-container border-4 border-inverse-surface px-6 py-3 hard-shadow font-headline font-black text-sm uppercase cursor-pointer"
                            >
                                + Add Your First Account
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <AnimatePresence mode="popLayout">
                                {accounts.map((account) => (
                                    <motion.div
                                        key={account.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                                    >
                                        <AccountCard
                                            account={account}
                                            currency={currency}
                                            onClick={() => setSelectedAccount(account)}
                                        />
                                    </motion.div>
                                ))}

                                {/* Add account card */}
                                <motion.button
                                    layout
                                    onClick={openCreateAccount}
                                    className="h-40 border-4 border-dashed border-inverse-surface flex flex-col items-center justify-center gap-2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer group"
                                >
                                    <span className="material-symbols-outlined text-4xl group-hover:scale-110 transition-transform">
                                        add_circle
                                    </span>
                                    <span className="font-headline font-black text-sm uppercase">Add Account</span>
                                </motion.button>
                            </AnimatePresence>
                        </div>
                    )}
                </motion.section>

                {/* ── Balance breakdown ──────────────────────────────────────────── */}
                {!isLoading && accounts.length > 0 && (
                    <motion.section variants={itemVariants} className="px-6 pt-8">
                        <h2 className="font-headline font-black text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-4">
                            Balance Breakdown
                        </h2>
                        <div className="bg-white border-4 border-inverse-surface hard-shadow p-5 space-y-3">
                            {accounts.map((account) => {
                                const pct = totalBalance > 0
                                    ? Math.round((account.currentBalance / totalBalance) * 100)
                                    : 0;
                                return (
                                    <div key={account.id}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-headline font-black text-sm uppercase truncate max-w-[60%]">
                                                {account.name}
                                            </span>
                                            <span className="font-headline font-bold text-sm text-on-surface-variant">
                                                {formatMoney(account.currentBalance, currency)} · {pct}%
                                            </span>
                                        </div>
                                        <div className="w-full h-2.5 bg-surface-container border border-inverse-surface/20 overflow-hidden">
                                            <motion.div
                                                className="h-full border-r border-inverse-surface/20"
                                                style={{ backgroundColor: account.colorTheme || '#CAFD00' }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.section>
                )}
            </motion.main>

            {/* ── Modals & sheets ────────────────────────────────────────────────── */}
            <ActionModal config={modal} onClose={() => setModal(null)} />

            <AnimatePresence>
                {selectedAccount && (
                    <AccountDetailSheet
                        key="detail"
                        account={selectedAccount}
                        currency={currency}
                        onClose={() => setSelectedAccount(null)}
                        onArchive={(id) => archiveAccount.mutate(id)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showTransfer && (
                    <TransferWizard
                        key="transfer"
                        accounts={accounts}
                        currency={currency}
                        onClose={() => setShowTransfer(false)}
                        onSuccess={() => setShowTransfer(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}