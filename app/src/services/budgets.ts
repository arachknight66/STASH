import { prisma } from '@/lib/prisma';
import type { CreateBudgetInput, UpdateBudgetInput } from '@/lib/schemas';
import { BudgetScope } from '@prisma/client';

export async function getBudgets(userId: string) {
  const budgets = await prisma.budget.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  // Compute current usage for each budget
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const enriched = await Promise.all(
    budgets.map(async (budget) => {
      const where: Record<string, unknown> = {
        userId,
        occurredAt: { gte: startOfMonth },
        type: { in: ['EXPENSE'] },
      };
      if (budget.scope === BudgetScope.CATEGORY && budget.category) {
        where.category = budget.category;
      }

      const result = await prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
      });

      const spent = result._sum.amount ?? 0;
      const pct = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
      const isOverBudget = spent > budget.amount;
      const isWarning = pct >= budget.alertThresholdPct && !isOverBudget;

      return { ...budget, spent, pct, isOverBudget, isWarning };
    })
  );

  return enriched;
}

export async function createBudget(userId: string, input: CreateBudgetInput) {
  return prisma.budget.create({
    data: {
      userId,
      name:              input.name,
      scope:             input.scope as BudgetScope,
      category:          input.category,
      amount:            input.amount,
      period:            input.period,
      startDay:          input.startDay,
      alertThresholdPct: input.alertThresholdPct,
      isActive:          true,
    },
  });
}

export async function updateBudget(userId: string, id: string, input: UpdateBudgetInput) {
  return prisma.budget.update({
    where: { id, userId },
    data: input,
  });
}

export async function deleteBudget(userId: string, id: string) {
  return prisma.budget.update({
    where: { id, userId },
    data: { isActive: false },
  });
}
