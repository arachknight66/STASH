import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';

export async function getStats(userId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [incomeAgg, expenseAgg, recentTransactions, buckets] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: TransactionType.INCOME }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: TransactionType.EXPENSE }
    }),
    prisma.transaction.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.bucket.findMany({ where: { userId } }),
  ]);

  // Liquidity = total income - total expenses
  const totalIncome  = incomeAgg._sum.amount ?? 0;
  const totalExpense = expenseAgg._sum.amount ?? 0;
  const liquidity    = totalIncome - totalExpense;

  // Monthly spend
  const monthlySpend  = recentTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
  const monthlyIncome = recentTransactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t)  => s + t.amount, 0);

  // Daily burn (last 30 days)
  const dailyBurn = monthlySpend / 30;

  // Budget runway (days until liquidity hits 0 at daily burn rate)
  const runway = dailyBurn > 0 ? Math.floor(liquidity / dailyBurn) : 999;

  // Category breakdown (last 30 days)
  const categoryBreakdown: Record<string, number> = {};
  recentTransactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .forEach(t => {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] ?? 0) + t.amount;
    });

  // Top spending category
  const topCategory = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'OTHER';

  // Bucket totals
  const totalSaved    = buckets.reduce((s, b) => s + b.savedUsd, 0);
  const totalMonthly  = buckets.reduce((s, b) => s + b.monthlyUsd, 0);
  const avgProgress   = buckets.length
    ? Math.round(buckets.reduce((s, b) => s + (b.savedUsd / b.targetUsd) * 100, 0) / buckets.length)
    : 0;

  // Net worth = liquidity + bucket savings
  const netWorth = liquidity + totalSaved;

  // Recovery move = potential savings from trimming top category by 20%
  const recoveryMove = (categoryBreakdown[topCategory] ?? 0) * 0.2;

  // Health score out of 100
  const savingsRate  = monthlyIncome > 0 ? (monthlyIncome - monthlySpend) / monthlyIncome : 0;
  const healthScore  = Math.min(100, Math.max(0, Math.round(savingsRate * 100)));

  return {
    liquidity,
    netWorth,
    monthlySpend,
    monthlyIncome,
    dailyBurn,
    runway,
    categoryBreakdown,
    topCategory,
    totalSaved,
    totalMonthly,
    avgProgress,
    recoveryMove,
    healthScore,
    bucketCount: buckets.length,
  };
}

export async function getNotifications(userId: string) {
  // Auto-generate weekly reminder
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const recentReminder = await prisma.notification.findFirst({
    where: { 
      userId, 
      title: 'Weekly Check-in',
      createdAt: { gte: sevenDaysAgo }
    }
  });

  if (!recentReminder) {
    await prisma.notification.create({
      data: {
        userId,
        type: 'GENERAL',
        title: 'Weekly Check-in',
        body: 'Did you hit your savings goals this week? Review your spending and top up a bucket.',
        link: '/buckets',
      }
    });
  }

  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export async function markNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
