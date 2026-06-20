import { db } from '@/lib/firebase-admin';
import { generateTags, generateInsight } from '@/lib/ai';
import type { CreateTransactionInput, TransactionFilter } from '@/lib/schemas';
import { Transaction, TransactionType } from '@/lib/types';

export async function getTransactions(userId: string, filter: TransactionFilter) {
  let query = db.collection('transactions').where('userId', '==', userId);

  // Exclude transfers from general feed (they appear in account views)
  if (!filter.type) {
    query = query.where('type', '!=', 'TRANSFER');
  } else {
    query = query.where('type', '==', filter.type);
  }

  if (filter.category) {
    query = query.where('category', '==', filter.category);
  }
  if (filter.accountId) {
    query = query.where('accountId', '==', filter.accountId);
  }

  const snap = await query.get();
  
  let items: any[] = [];
  snap.forEach((doc: any) => {
    const data = doc.data();
    items.push({
      ...data,
      createdAt: new Date(data.createdAt),
      occurredAt: new Date(data.occurredAt),
      updatedAt: new Date(data.updatedAt),
    });
  });

  // Apply date filters in memory (to avoid requiring composite index configuration in dev)
  if (filter.from) {
    const fromTime = new Date(filter.from).getTime();
    items = items.filter((item) => item.occurredAt.getTime() >= fromTime);
  }
  if (filter.to) {
    const toTime = new Date(filter.to).getTime();
    items = items.filter((item) => item.occurredAt.getTime() <= toTime);
  }

  // Sort descending by occurredAt
  items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  const total = items.length;
  
  // Apply pagination in memory
  const limit = filter.limit ?? 50;
  const offset = filter.offset ?? 0;
  items = items.slice(offset, offset + limit);

  // Fetch accounts to join account name and colorTheme
  const accountsSnap = await db.collection('accounts').where('userId', '==', userId).get();
  const accountsMap: Record<string, { name: string; colorTheme: string | null }> = {};
  accountsSnap.forEach((doc: any) => {
    accountsMap[doc.id] = { name: doc.data().name, colorTheme: doc.data().colorTheme || null };
  });

  // Join accounts
  const itemsWithAccount = items.map((item) => ({
    ...item,
    account: item.accountId ? (accountsMap[item.accountId] || null) : null,
  }));

  return { items: itemsWithAccount, total };
}

export async function createTransaction(userId: string, input: CreateTransactionInput): Promise<Transaction> {
  const isIncome   = input.type === 'INCOME';
  const isTransfer = input.type === 'TRANSFER';
  const isRefund   = input.type === 'REFUND';

  const [aiTags, aiInsight] = await Promise.all([
    (isIncome || isTransfer) ? Promise.resolve([]) : generateTags(input.merchant, input.amount, input.category, input.type),
    (isIncome || isTransfer) ? Promise.resolve(null) : generateInsight(input.merchant, input.amount, input.category, input.type),
  ]);

  const ref = db.collection('transactions').doc();
  const now = new Date().toISOString();
  const occurredAt = input.occurredAt ? new Date(input.occurredAt).toISOString() : now;

  const data = {
    id:                    ref.id,
    userId,
    accountId:             input.accountId || null,
    counterpartyAccountId: input.counterpartyAccountId || null,
    merchant:              input.merchant,
    amount:                input.amount,
    type:                  input.type as TransactionType,
    category:              input.category,
    subCategory:           input.subCategory || null,
    note:                  input.note || null,
    aiInsight:             aiInsight ?? input.aiInsight ?? null,
    tags:                  aiTags.length > 0 ? aiTags : (input.tags ?? []),
    occurredAt,
    createdAt:             now,
    updatedAt:             now,
    status:                input.status ?? 'POSTED',
    linkedSubscriptionId:  input.linkedSubscriptionId || null,
    linkedBillId:          input.linkedBillId || null,
    source:                'MANUAL',
    isRecurringCandidate:  false,
  };

  // Run transaction to write transaction and update account balance atomically
  await db.runTransaction(async (transaction: any) => {
    transaction.set(ref, data);

    if (input.accountId) {
      const accRef = db.collection('accounts').doc(input.accountId);
      const accSnap = await transaction.get(accRef);
      if (accSnap.exists) {
        const delta = (input.type === 'EXPENSE') ? -input.amount
                    : (input.type === 'INCOME' || isRefund) ? input.amount
                    : 0;
        if (delta !== 0) {
          const currentBalance = accSnap.data().currentBalance ?? 0;
          transaction.update(accRef, { 
            currentBalance: currentBalance + delta,
            updatedAt: now
          });
        }
      }
    }
  });

  return {
    ...data,
    occurredAt: new Date(occurredAt),
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

export async function deleteTransaction(userId: string, id: string): Promise<any> {
  const ref = db.collection('transactions').doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data().userId !== userId) {
    throw new Error('Transaction not found');
  }

  const tx = snap.data();
  const now = new Date().toISOString();

  await db.runTransaction(async (transaction: any) => {
    transaction.delete(ref);

    if (tx.accountId) {
      const accRef = db.collection('accounts').doc(tx.accountId);
      const accSnap = await transaction.get(accRef);
      if (accSnap.exists) {
        // Reverse balance effect
        const reversal = tx.type === 'EXPENSE' ? tx.amount
                       : tx.type === 'INCOME'  ? -tx.amount
                       : 0;
        if (reversal !== 0) {
          const currentBalance = accSnap.data().currentBalance ?? 0;
          transaction.update(accRef, { 
            currentBalance: currentBalance + reversal,
            updatedAt: now
          });
        }
      }
    }
  });

  return tx;
}
