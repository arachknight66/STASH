'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Transaction, Bucket, Notification, Settings } from '@/lib/types';
import type { CreateTransactionInput, CreateBucketInput, UpdateBucketInput, UpdateSettingsInput } from '@/lib/schemas';
import { useAppStore } from '@/store/app';

function authHeaders() {
  return { 'Content-Type': 'application/json' };
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export function useTransactions(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?${qs}`, { headers: authHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { items: Transaction[]; total: number };
    },
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Transaction;
    },
    onMutate: async (newTxInput) => {
      await qc.cancelQueries({ queryKey: ['transactions'] });
      await qc.cancelQueries({ queryKey: ['stats'] });

      const previousQueries = qc.getQueriesData({ queryKey: ['transactions'] });
      const prevStats = qc.getQueryData<any>(['stats']);

      const tempTx: any = {
        id: `opt-${Date.now()}`,
        userId: 'temp',
        merchant: newTxInput.merchant,
        amount: newTxInput.amount,
        type: newTxInput.type,
        category: newTxInput.category,
        note: newTxInput.note || null,
        aiInsight: 'Syncing insight...',
        tags: ['syncing...'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOptimistic: true,
      };

      qc.setQueriesData({ queryKey: ['transactions'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: [tempTx, ...old.items],
          total: old.total + 1,
        };
      });

      if (prevStats) {
        const change = newTxInput.type === 'INCOME' ? newTxInput.amount : -newTxInput.amount;
        qc.setQueryData(['stats'], {
          ...prevStats,
          liquidity: prevStats.liquidity + change,
          netWorth: prevStats.netWorth + change,
        });
      }

      return { previousQueries, prevStats };
    },
    onError: (_err, _newTxInput, context: any) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, value]: any) => {
          qc.setQueryData(queryKey, value);
        });
      }
      if (context?.prevStats) {
        qc.setQueryData(['stats'], context.prevStats);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['transactions'] });
      await qc.cancelQueries({ queryKey: ['stats'] });

      const previousQueries = qc.getQueriesData({ queryKey: ['transactions'] });
      const prevStats = qc.getQueryData<any>(['stats']);

      let deletedAmount = 0;
      let deletedType = 'EXPENSE';

      qc.setQueriesData({ queryKey: ['transactions'] }, (old: any) => {
        if (!old) return old;
        const target = old.items?.find((t: any) => t.id === id);
        if (target) {
          deletedAmount = target.amount;
          deletedType = target.type;
        }
        return {
          ...old,
          items: old.items?.filter((t: any) => t.id !== id) || [],
          total: Math.max(0, (old.total || 1) - 1),
        };
      });

      if (prevStats && deletedAmount > 0) {
        const change = deletedType === 'INCOME' ? -deletedAmount : deletedAmount;
        qc.setQueryData(['stats'], {
          ...prevStats,
          liquidity: prevStats.liquidity + change,
          netWorth: prevStats.netWorth + change,
        });
      }

      return { previousQueries, prevStats };
    },
    onError: (_err, _id, context: any) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, value]: any) => {
          qc.setQueryData(queryKey, value);
        });
      }
      if (context?.prevStats) {
        qc.setQueryData(['stats'], context.prevStats);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// ─── Buckets ──────────────────────────────────────────────────────────────────

export function useBuckets() {
  return useQuery({
    queryKey: ['buckets'],
    queryFn: async () => {
      const res = await fetch('/api/buckets', { headers: authHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Bucket[];
    },
  });
}

export function useCreateBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBucketInput) => {
      const res = await fetch('/api/buckets', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Bucket;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buckets'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateBucketInput & { id: string }) => {
      const res = await fetch(`/api/buckets/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Bucket;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buckets'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useBoostBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amountUsd }: { id: string; amountUsd: number }) => {
      const res = await fetch(`/api/buckets/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ amountUsd }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Bucket;
    },
    onMutate: async ({ id, amountUsd }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ['buckets'] });
      const prev = qc.getQueryData<Bucket[]>(['buckets']);
      qc.setQueryData<Bucket[]>(['buckets'], (old) =>
        old?.map((b) =>
          b.id === id
            ? { ...b, savedUsd: Math.min(b.savedUsd + amountUsd, b.targetUsd) }
            : b,
        ),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(['buckets'], ctx?.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['buckets'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDeleteBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/buckets/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buckets'] });
    },
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface StatsData {
  liquidity: number;
  netWorth: number;
  monthlySpend: number;
  monthlyIncome: number;
  dailyBurn: number;
  runway: number;
  categoryBreakdown: Record<string, number>;
  topCategory: string;
  totalSaved: number;
  totalMonthly: number;
  avgProgress: number;
  recoveryMove: number;
  healthScore: number;
  bucketCount: number;
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats', { headers: authHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as StatsData;
    },
    refetchInterval: 60_000,
  });
}

// ─── AI Intel ─────────────────────────────────────────────────────────────────

export interface IntelData {
  summary: string;
  tips: string[];
  vibeCheck: string;
  proInsight: string;
}

export function useIntel() {
  return useQuery({
    queryKey: ['intel'],
    queryFn: async () => {
      const res = await fetch('/api/intel', { headers: authHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as IntelData;
    },
    staleTime: 5 * 60_000, // cache for 5 min
    refetchOnWindowFocus: false,
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications', { headers: authHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Notification[];
    },
  });
}

export function useClearNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings', { headers: authHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Settings & {
        user: { name: string; email: string; initials: string };
      } | null;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  const setDarkMode = useAppStore((s) => s.setDarkMode);
  const setCurrency = useAppStore((s) => s.setCurrency);

  return useMutation({
    mutationFn: async (input: UpdateSettingsInput) => {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Settings;
    },
    onMutate: (input) => {
      // Optimistic local update — immediately reflects in UI
      if (input.darkMode !== undefined) setDarkMode(input.darkMode);
      if (input.currency !== undefined) setCurrency(input.currency as 'USD' | 'EUR' | 'INR' | 'GBP');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

import type { Account } from '@/lib/types';
import type { CreateAccountInput, UpdateAccountInput, TransferInput } from '@/lib/schemas';

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts', { headers: authHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data.accounts as Account[];
    },
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data.account as Account;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useArchiveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE', headers: authHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useTransferBetweenAccounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransferInput) => {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ _action: 'transfer', ...input }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// ─── Budgets ──────────────────────────────────────────────────────────────────

export interface EnrichedBudget {
  id: string;
  userId: string;
  name: string;
  scope: 'OVERALL' | 'CATEGORY';
  category: string | null;
  amount: number;
  period: string;
  startDay: number;
  alertThresholdPct: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // computed by API
  spent: number;
  pct: number;
  isOverBudget: boolean;
  isWarning: boolean;
}

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const res = await fetch('/api/budgets', { headers: authHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data.budgets as EnrichedBudget[];
    },
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data.budget as EnrichedBudget;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Budget delete is a PATCH with isActive: false
      const res = await fetch(`/api/budgets/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isActive: false }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}