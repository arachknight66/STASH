import { db } from '@/lib/firebase-admin';
import type { CreateBudgetInput, UpdateBudgetInput } from '@/lib/schemas';
import { BudgetScope, Budget } from '@/lib/types';

export async function getBudgets(userId: string) {
  const snap = await db.collection('budgets')
    .where('userId', '==', userId)
    .where('isActive', '==', true)
    .get();

  const budgets: Budget[] = [];
  snap.forEach((doc: any) => {
    const data = doc.data();
    budgets.push({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    } as Budget);
  });

  // Sort by createdAt ascending
  budgets.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Compute current usage for each budget
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch all EXPENSE transactions for this user
  const txSnap = await db.collection('transactions')
    .where('userId', '==', userId)
    .where('type', '==', 'EXPENSE')
    .get();

  const currentMonthExpenses: Array<{ amount: number; category: string; occurredAt: Date }> = [];
  txSnap.forEach((doc: any) => {
    const data = doc.data();
    const occurredAt = new Date(data.occurredAt);
    if (occurredAt.getTime() >= startOfMonth.getTime()) {
      currentMonthExpenses.push({
        amount: data.amount,
        category: data.category,
        occurredAt,
      });
    }
  });

  const enriched = budgets.map((budget) => {
    let spent = 0;
    if (budget.scope === BudgetScope.OVERALL) {
      spent = currentMonthExpenses.reduce((sum, tx) => sum + tx.amount, 0);
    } else if (budget.scope === BudgetScope.CATEGORY && budget.category) {
      spent = currentMonthExpenses
        .filter((tx) => tx.category === budget.category)
        .reduce((sum, tx) => sum + tx.amount, 0);
    }

    const pct = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
    const isOverBudget = spent > budget.amount;
    const isWarning = pct >= budget.alertThresholdPct && !isOverBudget;

    return { 
      ...budget, 
      spent, 
      pct, 
      isOverBudget, 
      isWarning 
    };
  });

  return enriched;
}

export async function createBudget(userId: string, input: CreateBudgetInput): Promise<Budget> {
  const ref = db.collection('budgets').doc();
  const now = new Date().toISOString();

  const data = {
    id:                ref.id,
    userId,
    name:              input.name,
    scope:             input.scope as BudgetScope,
    category:          input.category || null,
    amount:            input.amount,
    period:            input.period,
    startDay:          input.startDay,
    alertThresholdPct: input.alertThresholdPct,
    isActive:          true,
    createdAt:         now,
    updatedAt:         now,
  };

  await ref.set(data);

  return {
    ...data,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  } as Budget;
}

export async function updateBudget(userId: string, id: string, input: UpdateBudgetInput): Promise<Budget> {
  const ref = db.collection('budgets').doc(id);
  const snap = await ref.get();

  if (!snap.exists || snap.data().userId !== userId) {
    throw new Error('Budget not found');
  }

  const now = new Date().toISOString();
  const updateData = {
    ...input,
    updatedAt: now,
  };

  await ref.update(updateData);
  const updated = {
    ...snap.data(),
    ...updateData,
  };

  return {
    ...updated,
    createdAt: new Date(updated.createdAt),
    updatedAt: new Date(updated.updatedAt),
  } as Budget;
}

export async function deleteBudget(userId: string, id: string): Promise<Budget> {
  return updateBudget(userId, id, { isActive: false });
}
