import { prisma } from '@/lib/prisma';
import { generateTags, generateInsight } from '@/lib/ai';
import type { CreateTransactionInput, TransactionFilter } from '@/lib/schemas';

export async function getTransactions(userId: string, filter: TransactionFilter) {
  const where: Record<string, unknown> = { userId };

  // Exclude transfers from general feed (they appear in account views)
  if (!filter.type) {
    where.type = { notIn: ['TRANSFER'] };
  } else {
    where.type = filter.type;
  }

  if (filter.category) where.category = filter.category;
  if (filter.accountId) where.accountId = filter.accountId;
  if (filter.from || filter.to) {
    where.occurredAt = {};
    if (filter.from) (where.occurredAt as Record<string, unknown>).gte = new Date(filter.from);
    if (filter.to)   (where.occurredAt as Record<string, unknown>).lte = new Date(filter.to);
  }

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: filter.limit,
      skip: filter.offset,
      include: { account: { select: { name: true, colorTheme: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);

  return { items, total };
}

export async function createTransaction(userId: string, input: CreateTransactionInput) {
  const isIncome   = input.type === 'INCOME';
  const isTransfer = input.type === 'TRANSFER';
  const isRefund   = input.type === 'REFUND';

  const [aiTags, aiInsight] = await Promise.all([
    (isIncome || isTransfer) ? Promise.resolve([]) : generateTags(input.merchant, input.amount, input.category, input.type),
    (isIncome || isTransfer) ? Promise.resolve(null) : generateInsight(input.merchant, input.amount, input.category, input.type),
  ]);

  const tx = await prisma.transaction.create({
    data: {
      userId,
      accountId:            input.accountId,
      counterpartyAccountId:input.counterpartyAccountId,
      merchant:             input.merchant,
      amount:               input.amount,
      type:                 input.type as 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'REFUND',
      category:             input.category,
      subCategory:          input.subCategory,
      note:                 input.note,
      aiInsight:            aiInsight ?? input.aiInsight ?? null,
      tags:                 aiTags.length > 0 ? aiTags : (input.tags ?? []),
      occurredAt:           input.occurredAt ? new Date(input.occurredAt) : new Date(),
      status:               input.status ?? 'POSTED',
      linkedSubscriptionId: input.linkedSubscriptionId,
      linkedBillId:         input.linkedBillId,
      source:               'MANUAL',
    },
  });

  // Update account balance
  if (input.accountId) {
    const delta = (input.type === 'EXPENSE') ? -input.amount
                : (input.type === 'INCOME' || isRefund) ? input.amount
                : 0;
    if (delta !== 0) {
      await prisma.account.update({
        where: { id: input.accountId, userId },
        data: { currentBalance: { increment: delta } },
      });
    }
  }

  return tx;
}

export async function deleteTransaction(userId: string, id: string) {
  const tx = await prisma.transaction.findUnique({ where: { id, userId } });
  if (!tx) throw new Error('Transaction not found');

  // Reverse balance effect
  if (tx.accountId) {
    const reversal = tx.type === 'EXPENSE' ? tx.amount
                   : tx.type === 'INCOME'  ? -tx.amount
                   : 0;
    if (reversal !== 0) {
      await prisma.account.update({
        where: { id: tx.accountId, userId },
        data: { currentBalance: { increment: reversal } },
      });
    }
  }

  return prisma.transaction.delete({ where: { id, userId } });
}
