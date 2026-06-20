import { db } from '@/lib/firebase-admin';
import type { CreateBillInput, UpdateBillInput, MarkBillPaidInput } from '@/lib/schemas';
import { BillingCycle, BillStatus, Bill, Transaction, Account } from '@/lib/types';

export async function getBills(userId: string): Promise<Bill[]> {
  const snap = await db.collection('bills')
    .where('userId', '==', userId)
    .where('status', '!=', BillStatus.CLOSED)
    .get();

  const bills: Bill[] = [];
  snap.forEach((doc: any) => {
    const data = doc.data();
    bills.push({
      ...data,
      nextDueDate: new Date(data.nextDueDate),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    } as Bill);
  });

  // Sort chronologically ascending
  return bills.sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime());
}

export async function createBill(userId: string, input: CreateBillInput): Promise<Bill> {
  const ref = db.collection('bills').doc();
  const now = new Date().toISOString();

  const data = {
    id:                 ref.id,
    userId,
    name:               input.name,
    category:           input.category,
    amountExpected:     input.amountExpected || null,
    amountLastPaid:     null,
    accountId:          input.accountId || null,
    billingCycle:       input.billingCycle as BillingCycle,
    nextDueDate:        new Date(input.nextDueDate).toISOString(),
    autopay:            input.autopay,
    status:             BillStatus.ACTIVE,
    reminderDaysBefore: input.reminderDaysBefore,
    notes:              input.notes || null,
    createdAt:          now,
    updatedAt:          now,
  };

  await ref.set(data);

  return {
    ...data,
    nextDueDate: new Date(data.nextDueDate),
    createdAt: new Date(now),
    updatedAt: new Date(now),
  } as Bill;
}

export async function updateBill(userId: string, id: string, input: UpdateBillInput): Promise<Bill> {
  const ref = db.collection('bills').doc(id);
  const snap = await ref.get();

  if (!snap.exists || snap.data().userId !== userId) {
    throw new Error('Bill not found');
  }

  const now = new Date().toISOString();
  const updateData: any = {
    ...input,
    updatedAt: now,
  };

  if (input.nextDueDate) {
    updateData.nextDueDate = new Date(input.nextDueDate).toISOString();
  }

  await ref.update(updateData);
  const updated = {
    ...snap.data(),
    ...updateData,
  };

  return {
    ...updated,
    nextDueDate: new Date(updated.nextDueDate),
    createdAt: new Date(updated.createdAt),
    updatedAt: new Date(updated.updatedAt),
  } as Bill;
}

export async function deleteBill(userId: string, id: string): Promise<Bill> {
  return updateBill(userId, id, { status: BillStatus.CLOSED });
}

export async function markBillPaid(userId: string, id: string, input: MarkBillPaidInput) {
  const billRef = db.collection('bills').doc(id);
  const billSnap = await billRef.get();
  if (!billSnap.exists || billSnap.data().userId !== userId) {
    throw new Error('Bill not found');
  }

  const bill = billSnap.data();
  const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
  const now = new Date().toISOString();

  // Advance to next due date based on billing cycle
  const currentDueDate = new Date(bill.nextDueDate);
  const nextDueDate = advanceDueDate(currentDueDate, bill.billingCycle).toISOString();

  const txRef = db.collection('transactions').doc();
  const accountId = input.accountId ?? bill.accountId;

  const txData = {
    id:                    txRef.id,
    userId,
    accountId:             accountId || null,
    counterpartyAccountId: null,
    merchant:              bill.name.toUpperCase(),
    amount:                input.amountPaid,
    type:                  'EXPENSE',
    category:              bill.category,
    note:                  `Bill payment: ${bill.name}`,
    tags:                  ['bill', 'essential'],
    occurredAt:            paidAt.toISOString(),
    createdAt:             now,
    updatedAt:             now,
    source:                'BILL',
    status:                'POSTED',
    isRecurringCandidate:  false,
    linkedBillId:          id,
  };

  await db.runTransaction(async (transaction: any) => {
    // 1. Create linked transaction
    transaction.set(txRef, txData);

    // 2. Update bill due date and last paid amount
    transaction.update(billRef, {
      amountLastPaid: input.amountPaid,
      nextDueDate,
      updatedAt: now,
    });

    // 3. Update account balance if applicable
    if (accountId) {
      const accRef = db.collection('accounts').doc(accountId);
      const accSnap = await transaction.get(accRef);
      if (accSnap.exists) {
        const currentBalance = accSnap.data().currentBalance ?? 0;
        transaction.update(accRef, {
          currentBalance: currentBalance - input.amountPaid,
          updatedAt: now,
        });
      }
    }
  });

  return {
    bill: {
      ...bill,
      amountLastPaid: input.amountPaid,
      nextDueDate: new Date(nextDueDate),
      updatedAt: new Date(now),
    },
    transaction: {
      ...txData,
      occurredAt: paidAt,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    },
  };
}

function advanceDueDate(currentDue: Date, cycle: BillingCycle): Date {
  const d = new Date(currentDue);
  switch (cycle) {
    case 'WEEKLY':    d.setDate(d.getDate() + 7);   break;
    case 'MONTHLY':   d.setMonth(d.getMonth() + 1);  break;
    case 'QUARTERLY': d.setMonth(d.getMonth() + 3);  break;
    case 'YEARLY':    d.setFullYear(d.getFullYear() + 1); break;
    default:          d.setMonth(d.getMonth() + 1);
  }
  return d;
}
