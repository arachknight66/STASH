import { db } from '@/lib/firebase-admin';
import { TransactionType, NotificationType, Notification, Bucket } from '@/lib/types';

export async function getStats(userId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all transactions and buckets for the user in parallel
  const [txSnap, bucketSnap] = await Promise.all([
    db.collection('transactions').where('userId', '==', userId).get(),
    db.collection('buckets').where('userId', '==', userId).get(),
  ]);

  const transactions: any[] = [];
  txSnap.forEach((doc: any) => {
    const data = doc.data();
    transactions.push({
      ...data,
      occurredAt: new Date(data.occurredAt),
      createdAt: new Date(data.createdAt),
    });
  });

  const buckets: Bucket[] = [];
  bucketSnap.forEach((doc: any) => {
    const data = doc.data();
    buckets.push({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    } as Bucket);
  });

  // Calculate total income and expenses across all time
  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const liquidity = totalIncome - totalExpense;

  // Monthly stats (last 30 days)
  const recentTransactions = transactions.filter(
    (t) => t.occurredAt.getTime() >= thirtyDaysAgo.getTime()
  );

  const monthlySpend = recentTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const monthlyIncome = recentTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Daily burn (last 30 days)
  const dailyBurn = monthlySpend / 30;

  // Budget runway (days until liquidity hits 0 at daily burn rate)
  const runway = dailyBurn > 0 ? Math.floor(liquidity / dailyBurn) : 999;

  // Category breakdown (last 30 days)
  const categoryBreakdown: Record<string, number> = {};
  recentTransactions
    .filter((t) => t.type === 'EXPENSE')
    .forEach((t) => {
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

export async function getNotifications(userId: string): Promise<Notification[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Auto-generate weekly reminder if not present in the last 7 days
  const notifSnap = await db.collection('notifications')
    .where('userId', '==', userId)
    .get();

  const notifs: Notification[] = [];
  let recentReminderFound = false;

  notifSnap.forEach((doc: any) => {
    const data = doc.data();
    const createdAt = new Date(data.createdAt);
    
    if (data.title === 'Weekly Check-in' && createdAt.getTime() >= sevenDaysAgo.getTime()) {
      recentReminderFound = true;
    }

    notifs.push({
      ...data,
      createdAt,
    } as Notification);
  });

  if (!recentReminderFound) {
    const newRef = db.collection('notifications').doc();
    const now = new Date().toISOString();
    const newNotif = {
      id:        newRef.id,
      userId,
      type:      NotificationType.GENERAL,
      title:     'Weekly Check-in',
      body:      'Did you hit your savings goals this week? Review your spending and top up a bucket.',
      link:      '/buckets',
      isRead:    false,
      createdAt: now,
    };
    await newRef.set(newNotif);
    notifs.push({
      ...newNotif,
      createdAt: new Date(now),
    } as Notification);
  }

  // Sort descending by createdAt
  notifs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Return top 20 notifications
  return notifs.slice(0, 20);
}

export async function markNotificationsRead(userId: string): Promise<void> {
  const snap = await db.collection('notifications')
    .where('userId', '==', userId)
    .where('isRead', '==', false)
    .get();

  const batch = db.runTransaction(async (transaction: any) => {
    snap.forEach((doc: any) => {
      transaction.update(db.collection('notifications').doc(doc.id), { isRead: true });
    });
  });

  await batch;
}
