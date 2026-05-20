import { prisma } from '@/lib/prisma';
import { generateTags, generateInsight } from '@/lib/ai';
import type { CreateTransactionInput, TransactionFilter } from '@/lib/schemas';
import type { TransactionCategory, TransactionType } from '@prisma/client';

export async function getTransactions(userId: string, filter: TransactionFilter) {
  const where: Record<string, unknown> = { userId };

  if (filter.category) where.category = filter.category as TransactionCategory;
  if (filter.type) where.type = filter.type as TransactionType;
  if (filter.from || filter.to) {
    where.createdAt = {};
    if (filter.from) (where.createdAt as Record<string, unknown>).gte = new Date(filter.from);
    if (filter.to)   (where.createdAt as Record<string, unknown>).lte = new Date(filter.to);
  }

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter.limit,
      skip: filter.offset,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { items, total };
}

export async function createTransaction(userId: string, input: CreateTransactionInput) {
  // Generate AI tags and insight in parallel (non-blocking), ONLY for expenses
  const isIncome = input.type === 'INCOME';
  
  const [aiTags, aiInsight] = await Promise.all([
    isIncome ? Promise.resolve([]) : generateTags(input.merchant, input.amount, input.category, input.type),
    isIncome ? Promise.resolve(null) : generateInsight(input.merchant, input.amount, input.category, input.type),
  ]);

  return prisma.transaction.create({
    data: {
      userId,
      merchant:  input.merchant,
      amount:    input.amount,
      type:      input.type as TransactionType,
      category:  input.category as TransactionCategory,
      note:      input.note,
      aiInsight: aiInsight ?? input.aiInsight ?? null,
      tags:      aiTags.length > 0 ? aiTags : (input.tags ?? []),
    },
  });
}

export async function deleteTransaction(userId: string, id: string) {
  return prisma.transaction.delete({
    where: { id, userId },
  });
}
