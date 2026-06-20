import { db } from '@/lib/firebase-admin';
import type { CreateSubscriptionInput, UpdateSubscriptionInput } from '@/lib/schemas';
import { BillingCycle, SubscriptionStatus, Currency, Subscription, Transaction } from '@/lib/types';

export async function getSubscriptions(userId: string): Promise<Subscription[]> {
  const snap = await db.collection('subscriptions')
    .where('userId', '==', userId)
    .where('status', '!=', SubscriptionStatus.CANCELED)
    .get();

  const subs: Subscription[] = [];
  snap.forEach((doc: any) => {
    const data = doc.data();
    subs.push({
      ...data,
      nextBillingDate: new Date(data.nextBillingDate),
      lastChargedAt: data.lastChargedAt ? new Date(data.lastChargedAt) : null,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    } as Subscription);
  });

  // Sort by nextBillingDate ascending
  return subs.sort((a, b) => a.nextBillingDate.getTime() - b.nextBillingDate.getTime());
}

export async function createSubscription(userId: string, input: CreateSubscriptionInput): Promise<Subscription> {
  const ref = db.collection('subscriptions').doc();
  const now = new Date().toISOString();

  const data = {
    id:                ref.id,
    userId,
    name:              input.name,
    provider:          input.provider,
    category:          input.category,
    amount:            input.amount,
    currency:          Currency.USD,
    billingCycle:      input.billingCycle as BillingCycle,
    nextBillingDate:   new Date(input.nextBillingDate).toISOString(),
    lastChargedAt:     null,
    status:            SubscriptionStatus.ACTIVE,
    autopay:           input.autopay,
    accountId:         input.accountId || null,
    notes:             input.notes || null,
    icon:              input.icon || null,
    colorTheme:        input.colorTheme || null,
    merchantMatchRule: input.provider, // Rule matching merchant name
    createdAt:         now,
    updatedAt:         now,
  };

  await ref.set(data);

  return {
    ...data,
    nextBillingDate: new Date(data.nextBillingDate),
    createdAt: new Date(now),
    updatedAt: new Date(now),
  } as Subscription;
}

export async function updateSubscription(userId: string, id: string, input: UpdateSubscriptionInput): Promise<Subscription> {
  const ref = db.collection('subscriptions').doc(id);
  const snap = await ref.get();

  if (!snap.exists || snap.data().userId !== userId) {
    throw new Error('Subscription not found');
  }

  const now = new Date().toISOString();
  const updateData: any = {
    ...input,
    updatedAt: now,
  };

  if (input.nextBillingDate) {
    updateData.nextBillingDate = new Date(input.nextBillingDate).toISOString();
  }

  await ref.update(updateData);
  const updated = {
    ...snap.data(),
    ...updateData,
  };

  return {
    ...updated,
    nextBillingDate: new Date(updated.nextBillingDate),
    lastChargedAt: updated.lastChargedAt ? new Date(updated.lastChargedAt) : null,
    createdAt: new Date(updated.createdAt),
    updatedAt: new Date(updated.updatedAt),
  } as Subscription;
}

export async function deleteSubscription(userId: string, id: string): Promise<Subscription> {
  return updateSubscription(userId, id, { status: SubscriptionStatus.CANCELED });
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
  const snap = await db.collection('subscriptions')
    .where('userId', '==', userId)
    .where('status', '==', SubscriptionStatus.ACTIVE)
    .get();

  const subs: Subscription[] = [];
  snap.forEach((doc: any) => {
    const data = doc.data();
    subs.push({
      ...data,
      nextBillingDate: new Date(data.nextBillingDate),
      lastChargedAt: data.lastChargedAt ? new Date(data.lastChargedAt) : null,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    } as Subscription);
  });

  const monthlyTotal = subs.reduce((sum, s) => sum + monthlyAmount(s.amount, s.billingCycle), 0);
  const annualTotal  = monthlyTotal * 12;

  // Get last 30 days income to compute burden %
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const txSnap = await db.collection('transactions')
    .where('userId', '==', userId)
    .where('type', '==', 'INCOME')
    .get();

  let monthlyIncome = 0;
  txSnap.forEach((doc: any) => {
    const data = doc.data();
    const occurredAt = new Date(data.occurredAt);
    if (occurredAt.getTime() >= thirtyDaysAgo.getTime()) {
      monthlyIncome += data.amount || 0;
    }
  });

  const burdenPct = monthlyIncome > 0 ? Math.round((monthlyTotal / monthlyIncome) * 100) : 0;

  return { subs, monthlyTotal, annualTotal, burdenPct, monthlyIncome };
}

/**
 * Heuristic: find merchants that appear 2+ times with similar amounts
 * at ~weekly/monthly intervals — flag them as recurring candidates.
 */
export async function getSuggestedSubscriptions(userId: string) {
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

  const txSnap = await db.collection('transactions')
    .where('userId', '==', userId)
    .where('type', '==', 'EXPENSE')
    .get();

  const txs: Array<{ merchant: string; amount: number; occurredAt: Date; linkedSubscriptionId?: string | null }> = [];
  txSnap.forEach((doc: any) => {
    const data = doc.data();
    const occurredAt = new Date(data.occurredAt);
    if (occurredAt.getTime() >= sixMonthsAgo.getTime()) {
      txs.push({
        merchant:             data.merchant,
        amount:               data.amount,
        occurredAt,
        linkedSubscriptionId: data.linkedSubscriptionId || null,
      });
    }
  });

  // Sort chronologically ascending
  txs.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

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
  const subSnap = await db.collection('subscriptions')
    .where('userId', '==', userId)
    .get();

  const trackedMerchants = new Set<string>();
  subSnap.forEach((doc: any) => {
    const rule = doc.data().merchantMatchRule;
    if (rule) trackedMerchants.add(rule);
  });

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
