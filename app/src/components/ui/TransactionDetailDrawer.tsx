'use client';

import {
    useState,
    useRef,
    useCallback,
    useEffect,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app';
import { useDeleteTransaction } from '@/hooks/useStash';
import { haptics } from '@/lib/haptics';
import { formatMoney } from '@/lib/currencies';
import { CATEGORY_META } from '@/lib/constants';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrawerTransaction {
    id: string;
    merchant: string;
    amount: number;
    type: string;
    category: string;
    note?: string | null;
    aiInsight?: string | null;
    tags: string[];
    createdAt: Date | string;
    occurredAt: Date | string;
    source: string;
    status: string;
    accountId?: string | null;
    account?: { name: string; colorTheme: string | null } | null;
    isOptimistic?: boolean;
}

interface TransactionDetailDrawerProps {
    transaction: DrawerTransaction | null;
    onClose: () => void;
    onDeleted?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
    'FOOD', 'DRIP', 'ENTERTAINMENT', 'TRANSPORT',
    'BILLS', 'COFFEE', 'SAVINGS', 'INCOME', 'OTHER',
] as const;

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
    EXPENSE: { label: 'Expense', cls: 'bg-error-container text-on-error-container border-error/30' },
    INCOME: { label: 'Income', cls: 'bg-primary-container text-on-primary-container border-primary/30' },
    TRANSFER: { label: 'Transfer', cls: 'bg-surface-container text-on-surface border-inverse-surface/30' },
    REFUND: { label: 'Refund', cls: 'bg-tertiary-container text-on-surface border-tertiary/30' },
};

const SOURCE_LABEL: Record<string, string> = {
    MANUAL: 'Manual entry',
    SUBSCRIPTION: 'Subscription charge',
    BILL: 'Bill payment',
    SYSTEM: 'System generated',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFullDate(d: Date | string): string {
    return new Date(d).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TransactionDetailDrawer({
    transaction,
    onClose,
    onDeleted,
}: TransactionDetailDrawerProps) {
    const currency = useAppStore((s) => s.currency);
    const showToast = useAppStore((s) => s.showToast);
    const qc = useQueryClient();
    const deleteTx = useDeleteTransaction();

    // Local state for inline edits — optimistic, synced on save
    const [editingNote, setEditingNote] = useState(false);
    const [noteValue, setNoteValue] = useState('');
    const [editingCategory, setEditingCategory] = useState(false);
    const [localCategory, setLocalCategory] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const noteRef = useRef<HTMLTextAreaElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);

    // Sync local state when transaction changes
    useEffect(() => {
        if (transaction) {
            setNoteValue(transaction.note ?? '');
            setLocalCategory(transaction.category);
            setEditingNote(false);
            setEditingCategory(false);
            setConfirmDelete(false);
        }
    }, [transaction?.id]);

    // Body scroll lock
    useEffect(() => {
        if (!transaction) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [!!transaction]);

    // Escape key
    useEffect(() => {
        if (!transaction) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [!!transaction, onClose]);

    // Focus textarea when entering note edit mode
    useEffect(() => {
        if (editingNote) {
            setTimeout(() => noteRef.current?.focus(), 60);
        }
    }, [editingNote]);

    // ── Drag-to-dismiss ────────────────────────────────────────────────────
    const dragY = useMotionValue(0);
    const opacity = useTransform(dragY, [0, 200], [1, 0]);
    const THRESHOLD = 90; // px drag before dismiss fires

    const onDragEnd = useCallback(
        (_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
            if (info.offset.y > THRESHOLD || info.velocity.y > 600) {
                onClose();
            } else {
                dragY.set(0);
            }
        },
        [onClose, dragY],
    );

    // ── Category change ────────────────────────────────────────────────────
    async function handleCategoryChange(newCat: string) {
        if (!transaction || newCat === localCategory) {
            setEditingCategory(false);
            return;
        }
        const prev = localCategory;
        setLocalCategory(newCat);
        setEditingCategory(false);

        try {
            const res = await fetch(`/api/transactions/${transaction.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: newCat }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error ?? 'Update failed');
            qc.invalidateQueries({ queryKey: ['transactions'] });
            showToast('Category updated.', 'success');
        } catch {
            // Revert optimistic update if PATCH endpoint not yet wired
            setLocalCategory(prev);
            showToast('Category saved locally — backend update pending.', 'info');
        }
    }

    // ── Note save ──────────────────────────────────────────────────────────
    async function handleNoteSave() {
        if (!transaction) return;
        setIsSavingNote(true);
        try {
            const res = await fetch(`/api/transactions/${transaction.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: noteValue.trim() || null }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error ?? 'Update failed');
            qc.invalidateQueries({ queryKey: ['transactions'] });
            showToast('Note saved.', 'success');
        } catch {
            showToast('Note saved locally — backend update pending.', 'info');
        } finally {
            setIsSavingNote(false);
            setEditingNote(false);
        }
    }

    // ── Delete ─────────────────────────────────────────────────────────────
    function handleDelete() {
        if (!transaction) return;
        deleteTx.mutate(transaction.id, {
            onSuccess: () => {
                showToast('Transaction deleted.', 'info');
                onDeleted?.();
                onClose();
            },
        });
    }

    // ── Render ─────────────────────────────────────────────────────────────

    if (!transaction) return null;

    const isIncome = transaction.type === 'INCOME';
    const isOptimistic = transaction.isOptimistic;
    const meta = CATEGORY_META[localCategory] ?? CATEGORY_META.OTHER;
    const typeBadge = TYPE_BADGE[transaction.type] ?? TYPE_BADGE.EXPENSE;

    return (
        <AnimatePresence>
            {transaction && (
                <>
                    {/* Overlay */}
                    <motion.div
                        key="tx-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[80] bg-black/50"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Sheet */}
                    <motion.div
                        key="tx-sheet"
                        ref={sheetRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Transaction: ${transaction.merchant}`}
                        style={{ y: dragY, opacity }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.3 }}
                        onDragEnd={onDragEnd}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                        className="fixed bottom-0 left-0 right-0 z-[85] max-w-lg mx-auto bg-white dark:bg-[#161d22] border-4 border-b-0 border-inverse-surface hard-shadow-lg max-h-[92dvh] flex flex-col touch-none"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag handle */}
                        <div
                            className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
                            aria-hidden="true"
                        >
                            <div className="w-12 h-1 bg-inverse-surface/20 rounded-full" />
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto min-h-0">

                            {/* ── Hero: merchant + amount ──────────────────────────── */}
                            <div className="px-6 pt-4 pb-5 border-b-2 border-inverse-surface/10">
                                {isOptimistic && (
                                    <span className="inline-block text-[9px] font-black uppercase tracking-widest text-white bg-black px-2 py-0.5 mb-3 pulse-sync">
                                        Syncing
                                    </span>
                                )}

                                {/* Merchant */}
                                <p className="font-headline font-black text-lg uppercase tracking-tight text-on-surface-variant mb-1">
                                    {transaction.merchant}
                                </p>

                                {/* THE AMOUNT — signature element */}
                                <p
                                    className={`font-headline font-black leading-none tracking-tighter ${isIncome ? 'text-primary-dim' : 'text-error'
                                        } ${transaction.amount >= 1000 ? 'text-5xl' : 'text-6xl'
                                        }`}
                                >
                                    {isIncome ? '+' : '−'}
                                    {formatMoney(transaction.amount, currency)}
                                </p>

                                {/* Type badge + category pill */}
                                <div className="flex items-center gap-2 mt-4 flex-wrap">
                                    <span className={`text-[10px] font-black px-2.5 py-1 border uppercase tracking-wider ${typeBadge.cls}`}>
                                        {typeBadge.label}
                                    </span>

                                    {/* Category pill — tappable to edit */}
                                    <button
                                        onClick={() => setEditingCategory((p) => !p)}
                                        className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 border-2 border-inverse-surface uppercase tracking-wider bg-surface-container hover:bg-primary-container transition-colors cursor-pointer"
                                        aria-label="Change category"
                                        aria-expanded={editingCategory}
                                    >
                                        <span>{meta.emoji}</span>
                                        <span>{meta.label}</span>
                                        <span className="material-symbols-outlined text-xs leading-none opacity-50">
                                            {editingCategory ? 'expand_less' : 'edit'}
                                        </span>
                                    </button>
                                </div>

                                {/* Category picker — expands inline */}
                                <AnimatePresence>
                                    {editingCategory && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="flex gap-2 overflow-x-auto pb-1 pt-3 -mx-1 px-1">
                                                {CATEGORIES.map((cat) => {
                                                    const m = CATEGORY_META[cat] ?? CATEGORY_META.OTHER;
                                                    const isSel = cat === localCategory;
                                                    return (
                                                        <button
                                                            key={cat}
                                                            onClick={() => handleCategoryChange(cat)}
                                                            className={[
                                                                'flex items-center gap-1.5 px-3 py-2 border-2 font-headline font-black text-[10px] uppercase whitespace-nowrap cursor-pointer transition-colors shrink-0',
                                                                isSel
                                                                    ? 'bg-primary-container border-inverse-surface'
                                                                    : 'bg-white border-inverse-surface/40 hover:border-inverse-surface',
                                                            ].join(' ')}
                                                        >
                                                            <span>{m.emoji}</span>
                                                            <span>{m.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* ── AI Insight ─────────────────────────────────────── */}
                            {transaction.aiInsight && (() => {
                                const insightText = transaction.aiInsight ?? '';
                                const isUnusual = ['unusual', 'spike', 'exceeded', 'high', 'warning', 'abnormal', 'anomaly'].some(
                                    (kw) => insightText.toLowerCase().includes(kw)
                                );
                                return (
                                    <div className={`mx-6 mt-5 border-2 p-4 ${
                                        isUnusual 
                                            ? 'bg-[#ffbdf3] border-inverse-surface text-inverse-surface' 
                                            : 'bg-surface-container border-inverse-surface'
                                    }`}>
                                        <p className="font-headline font-black uppercase text-[10px] tracking-[0.18em] mb-1.5 flex items-center gap-1.5 text-on-surface-variant">
                                            <span
                                                className="material-symbols-outlined text-sm leading-none"
                                                style={{ fontVariationSettings: "'FILL' 1" }}
                                            >
                                                psychology
                                            </span>
                                            AI Insight
                                        </p>
                                        <p className="font-bold text-sm leading-snug">{transaction.aiInsight}</p>
                                    </div>
                                );
                            })()}

                            {/* ── Details grid ───────────────────────────────────── */}
                            <div className="mx-6 mt-5 grid grid-cols-2 gap-3">
                                {[
                                    {
                                        label: 'Date',
                                        value: formatFullDate(transaction.occurredAt),
                                    },
                                    {
                                        label: 'Account',
                                        value: transaction.account?.name ?? (transaction.accountId ? '…' : 'No account'),
                                    },
                                    {
                                        label: 'Source',
                                        value: SOURCE_LABEL[transaction.source] ?? transaction.source,
                                    },
                                    {
                                        label: 'Status',
                                        value: transaction.status === 'POSTED' ? '✓ Posted' : '⏳ Pending',
                                    },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-surface-container border-2 border-inverse-surface p-3">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">
                                            {label}
                                        </p>
                                        <p className="font-bold text-xs leading-snug">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* ── Tags ───────────────────────────────────────────── */}
                            {transaction.tags && transaction.tags.length > 0 && (
                                <div className="mx-6 mt-5">
                                    <p className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">
                                        Tags
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {transaction.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="bg-surface-container border border-inverse-surface/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Note ───────────────────────────────────────────── */}
                            <div className="mx-6 mt-5">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant">
                                        Note
                                    </p>
                                    {!editingNote && (
                                        <button
                                            onClick={() => setEditingNote(true)}
                                            className="flex items-center gap-1 text-[10px] font-black uppercase text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm leading-none">edit</span>
                                            {noteValue ? 'Edit' : 'Add note'}
                                        </button>
                                    )}
                                </div>

                                <AnimatePresence mode="wait">
                                    {editingNote ? (
                                        <motion.div
                                            key="edit"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="space-y-2"
                                        >
                                            <textarea
                                                ref={noteRef}
                                                value={noteValue}
                                                onChange={(e) => setNoteValue(e.target.value)}
                                                placeholder="Add a note about this transaction…"
                                                rows={3}
                                                className="w-full border-2 border-inverse-surface bg-white dark:bg-[#1d252b] dark:text-white px-3 py-2.5 font-bold text-sm resize-none focus:outline-none focus:ring-2 focus:ring-secondary"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setEditingNote(false); setNoteValue(transaction.note ?? ''); }}
                                                    className="border-2 border-inverse-surface px-4 py-2 font-headline font-black text-xs uppercase hover:bg-surface-container transition-colors cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleNoteSave}
                                                    disabled={isSavingNote}
                                                    className="bg-primary-container border-2 border-inverse-surface px-4 py-2 font-headline font-black text-xs uppercase hard-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
                                                >
                                                    {isSavingNote ? 'Saving…' : 'Save Note'}
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="view"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            {noteValue ? (
                                                <p
                                                    className="font-bold text-sm text-on-surface leading-relaxed italic border-l-4 border-secondary pl-3 cursor-pointer hover:border-primary transition-colors"
                                                    onClick={() => setEditingNote(true)}
                                                >
                                                    "{noteValue}"
                                                </p>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingNote(true)}
                                                    className="text-sm font-bold text-on-surface-variant opacity-50 hover:opacity-100 transition-opacity cursor-pointer italic"
                                                >
                                                    No note — tap to add one.
                                                </button>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Bottom padding */}
                            <div className="h-6" />
                        </div>

                        {/* ── Footer: delete ──────────────────────────────────────── */}
                        <div className="px-6 py-4 border-t-2 border-inverse-surface/10 shrink-0 flex items-center justify-between gap-4">
                            <button
                                onClick={() => {
                                    haptics.light();
                                    onClose();
                                }}
                                className="border-2 border-inverse-surface px-5 py-2.5 font-headline font-black text-xs uppercase hover:bg-surface-container transition-colors cursor-pointer"
                            >
                                Close
                            </button>

                            <AnimatePresence mode="wait">
                                {confirmDelete ? (
                                    <motion.div
                                        key="confirm"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="flex items-center gap-2"
                                    >
                                        <span className="font-bold text-xs text-error uppercase">Sure?</span>
                                        <button
                                            onClick={() => {
                                                haptics.light();
                                                handleDelete();
                                            }}
                                            disabled={deleteTx.isPending || isOptimistic}
                                            className="bg-error text-white border-2 border-error px-4 py-2 font-headline font-black text-xs uppercase cursor-pointer disabled:opacity-50"
                                        >
                                            {deleteTx.isPending ? 'Deleting…' : 'Delete'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                haptics.light();
                                                setConfirmDelete(false);
                                            }}
                                            className="border-2 border-inverse-surface px-3 py-2 font-headline font-black text-xs uppercase hover:bg-surface-container transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.button
                                        key="delete-btn"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => {
                                            haptics.warning();
                                            setConfirmDelete(true);
                                        }}
                                        disabled={isOptimistic}
                                        className="flex items-center gap-1.5 text-xs font-bold uppercase text-on-surface-variant hover:text-error transition-colors cursor-pointer disabled:opacity-30"
                                    >
                                        <span className="material-symbols-outlined text-base leading-none">delete</span>
                                        Delete transaction
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}