import { db } from '@/lib/firebase-admin';
import type { CreateAccountInput, UpdateAccountInput, TransferInput } from '@/lib/schemas';
import { AccountType, Currency, Account, Transaction } from '@/lib/types';

export async function getAccounts(userId: string): Promise<Account[]> {
  const snap = await db.collection('accounts')
    .where('userId', '==', userId)
    .where('isArchived', '==', false)
    .get();

  const accounts: Account[] = [];
  snap.forEach((doc: any) => {
    const data = doc.data();
    accounts.push({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  });

  // Sort locally in case composite index isn't ready in user's environment
  return accounts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function createAccount(userId: string, input: CreateAccountInput): Promise<Account> {
  const ref = db.collection('accounts').doc();
  const now = new Date().toISOString();
  
  const data = {
    id:             ref.id,
    userId,
    name:           input.name,
    type:           input.type as AccountType,
    description:    input.description || null,
    openingBalance: input.openingBalance ?? 0,
    currentBalance: input.openingBalance ?? 0,
    currency:       Currency.USD,
    colorTheme:     input.colorTheme || null,
    icon:           input.icon || null,
    isArchived:     false,
    createdAt:      now,
    updatedAt:      now,
  };

  await ref.set(data);
  return {
    ...data,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

export async function updateAccount(userId: string, id: string, input: UpdateAccountInput): Promise<Account> {
  const ref = db.collection('accounts').doc(id);
  const snap = await ref.get();

  if (!snap.exists || snap.data().userId !== userId) {
    throw new Error('Account not found');
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
  } as Account;
}

export async function deleteAccount(userId: string, id: string): Promise<Account> {
  // Soft delete: archive instead
  return updateAccount(userId, id, { isArchived: true });
}

export async function transferBetweenAccounts(userId: string, input: TransferInput) {
  const occurredAt = input.occurredAt ? new Date(input.occurredAt).toISOString() : new Date().toISOString();
  const now = new Date().toISOString();

  const fromRef = db.collection('accounts').doc(input.fromAccountId);
  const toRef = db.collection('accounts').doc(input.toAccountId);
  const debitRef = db.collection('transactions').doc();
  const creditRef = db.collection('transactions').doc();

  const result = await db.runTransaction(async (transaction: any) => {
    const fromSnap = await transaction.get(fromRef);
    const toSnap = await transaction.get(toRef);

    if (!fromSnap.exists || fromSnap.data().userId !== userId) {
      throw new Error('Source account not found or unauthorized');
    }
    if (!toSnap.exists || toSnap.data().userId !== userId) {
      throw new Error('Destination account not found or unauthorized');
    }

    const fromData = fromSnap.data();
    const toData = toSnap.data();

    const newFromBalance = (fromData.currentBalance ?? 0) - input.amount;
    const newToBalance = (toData.currentBalance ?? 0) + input.amount;

    const debitTx = {
      id:                    debitRef.id,
      userId,
      accountId:             input.fromAccountId,
      counterpartyAccountId: input.toAccountId,
      merchant:              'INTERNAL TRANSFER',
      amount:                input.amount,
      type:                  'TRANSFER',
      category:              'OTHER',
      note:                  input.note || 'Transfer',
      tags:                  ['transfer'],
      occurredAt,
      createdAt:             now,
      updatedAt:             now,
      source:                'MANUAL',
      status:                'POSTED',
      isRecurringCandidate:  false,
    };

    const creditTx = {
      id:                    creditRef.id,
      userId,
      accountId:             input.toAccountId,
      counterpartyAccountId: input.fromAccountId,
      merchant:              'INTERNAL TRANSFER',
      amount:                input.amount,
      type:                  'INCOME',
      category:              'INCOME',
      note:                  input.note || 'Transfer received',
      tags:                  ['transfer'],
      occurredAt,
      createdAt:             now,
      updatedAt:             now,
      source:                'MANUAL',
      status:                'POSTED',
      isRecurringCandidate:  false,
    };

    transaction.set(debitRef, debitTx);
    transaction.set(creditRef, creditTx);
    
    transaction.update(fromRef, { 
      currentBalance: newFromBalance, 
      updatedAt: now 
    });
    transaction.update(toRef, { 
      currentBalance: newToBalance, 
      updatedAt: now 
    });

    return {
      debit: {
        ...debitTx,
        occurredAt: new Date(occurredAt),
        createdAt: new Date(now),
        updatedAt: new Date(now),
      },
      credit: {
        ...creditTx,
        occurredAt: new Date(occurredAt),
        createdAt: new Date(now),
        updatedAt: new Date(now),
      },
    };
  });

  return result;
}

export async function getAccountTotalBalance(userId: string): Promise<number> {
  const snap = await db.collection('accounts')
    .where('userId', '==', userId)
    .where('isArchived', '==', false)
    .get();

  let sum = 0;
  snap.forEach((doc: any) => {
    sum += doc.data().currentBalance || 0;
  });
  return sum;
}
