import { prisma } from '@/lib/prisma';
import type { CreateSubscriptionInput, UpdateSubscriptionInput } from '@/lib/schemas';
import { BillingCycle, SubscriptionStatus } from '@prisma/client';

export async function getSubscriptions(userId: string) {
  return prisma.subscription.findMany({
    where: { userId, status: { not: SubscriptionStatus.CANCELED } },
    orderBy: { nextBillingDate: 'asc' },
  });
}

export async function createSubscription(userId: string, input: CreateSubscriptionInput) {
  return prisma.subscription.create({
    data: {
      userId,
      name:            input.name,
      provider:        input.provider,
      category:        input.category,
      amount:          input.amount,
      billingCycle:    input.billingCycle as BillingCycle,
      nextBillingDate: new Date(input.nextBillingDate),
      accountId:       input.accountId,
      autopay:         input.autopay,
      notes:           input.notes,
      icon:            input.icon,
      colorTheme:      input.colorTheme,
    },
  });
}

export async function updateSubscription(userId: string, id: string, input: UpdateSubscriptionInput) {
  return prisma.subscription.update({
    where: { id, userId },
    data: {
      ...input,
      nextBillingDate: input.nextBillingDate ? new Date(input.nextBillingDate) : undefined,
      status: input.status as SubscriptionStatus | undefined,
    },
  });
}

export async function deleteSubscription(userId: string, id: string) {
  return prisma.subscription.update({
    where: { id, userId },
    data: { status: SubscriptionStatus.CANCELED },
  });
}

/** Monthly cost in USD for a subscription */
function monthlyAmount(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'WEEKLY':    return amount * 4.33;
    case 'MONTHLY':   return amount;
    case 'QUARTERLY': return amount / 3;
    case 'YEARLY':    return amount / 12;
    default:          return amount;
  }
}

export async function getSubscriptionBurden(userId: string) {
  const subs = await prisma.subscription.findMany({
    where: { userId, status: SubscriptionStatus.ACTIVE },
  });

  const monthlyTotal = subs.reduce((sum, s) => sum + monthlyAmount(s.amount, s.billingCycle), 0);
  const annualTotal  = monthlyTotal * 12;

  // Get last 30 days income to compute burden %
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const incomeResult = await prisma.transaction.aggregate({
    where: { userId, type: 'INCOME', occurredAt: { gte: thirtyDaysAgo } },
    _sum: { amount: true },
  });
  const monthlyIncome = incomeResult._sum.amount ?? 0;
  const burdenPct = monthlyIncome > 0 ? Math.round((monthlyTotal / monthlyIncome) * 100) : 0;

  return { subs, monthlyTotal, annualTotal, burdenPct, monthlyIncome };
}

/**
 * Heuristic: find merchants that appear 2+ times with similar amounts
 * at ~weekly/monthly intervals — flag them as recurring candidates.
 */
export async function getSuggestedSubscriptions(userId: string) {
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      occurredAt: { gte: sixMonthsAgo },
    },
    orderBy: { occurredAt: 'asc' },
    select: { merchant: true, amount: true, occurredAt: true, linkedSubscriptionId: true },
  });

  // Group by merchant
  const merchantMap = new Map<string, { amounts: number[]; dates: Date[] }>();
  for (const tx of txs) {
    if (tx.linkedSubscriptionId) continue; // already tracked
    const existing = merchantMap.get(tx.merchant);
    if (existing) {
      existing.amounts.push(tx.amount);
      existing.dates.push(tx.occurredAt);
    } else {
      merchantMap.set(tx.merchant, { amounts: [tx.amount], dates: [tx.occurredAt] });
    }
  }

  // Filter merchants with 2+ occurrences and consistent amounts (±10%)
  const existingSubs = await prisma.subscription.findMany({
    where: { userId },
    select: { merchantMatchRule: true },
  });
  const trackedMerchants = new Set(existingSubs.map((s) => s.merchantMatchRule).filter(Boolean));

  const candidates: { merchant: string; avgAmount: number; occurrences: number; suggestedCycle: string }[] = [];

  for (const [merchant, { amounts, dates }] of merchantMap.entries()) {
    if (amounts.length < 2) continue;
    if (trackedMerchants.has(merchant)) continue;

    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const allSimilar = amounts.every((a) => Math.abs(a - avg) / avg < 0.1); // within 10%
    if (!allSimilar) continue;

    // Detect interval
    let suggestedCycle = 'MONTHLY';
    if (dates.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        gaps.push((dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
      }
      const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      if (avgGap < 10)       suggestedCycle = 'WEEKLY';
      else if (avgGap < 45)  suggestedCycle = 'MONTHLY';
      else if (avgGap < 100) suggestedCycle = 'QUARTERLY';
      else                   suggestedCycle = 'YEARLY';
    }

    candidates.push({ merchant, avgAmount: Math.round(avg * 100) / 100, occurrences: amounts.length, suggestedCycle });
  }

  return candidates.sort((a, b) => b.occurrences - a.occurrences).slice(0, 5);
}
