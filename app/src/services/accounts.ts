import { prisma } from '@/lib/prisma';
import type { CreateAccountInput, UpdateAccountInput, TransferInput } from '@/lib/schemas';
import { AccountType, Currency } from '@prisma/client';

export async function getAccounts(userId: string) {
  return prisma.account.findMany({
    where: { userId, isArchived: false },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createAccount(userId: string, input: CreateAccountInput) {
  return prisma.account.create({
    data: {
      userId,
      name:           input.name,
      type:           input.type as AccountType,
      description:    input.description,
      openingBalance: input.openingBalance ?? 0,
      currentBalance: input.openingBalance ?? 0,
      currency:       Currency.USD,
      colorTheme:     input.colorTheme,
      icon:           input.icon,
    },
  });
}

export async function updateAccount(userId: string, id: string, input: UpdateAccountInput) {
  return prisma.account.update({
    where: { id, userId },
    data: input,
  });
}

export async function deleteAccount(userId: string, id: string) {
  // Soft delete: archive instead
  return prisma.account.update({
    where: { id, userId },
    data: { isArchived: true },
  });
}

export async function transferBetweenAccounts(userId: string, input: TransferInput) {
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();

  // Create two linked TRANSFER transactions
  const [debit, credit] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId,
        accountId: input.fromAccountId,
        counterpartyAccountId: input.toAccountId,
        merchant: 'INTERNAL TRANSFER',
        amount: input.amount,
        type: 'TRANSFER',
        category: 'OTHER',
        note: input.note || 'Transfer',
        tags: ['transfer'],
        occurredAt,
        source: 'MANUAL',
        status: 'POSTED',
      },
    }),
    prisma.transaction.create({
      data: {
        userId,
        accountId: input.toAccountId,
        counterpartyAccountId: input.fromAccountId,
        merchant: 'INTERNAL TRANSFER',
        amount: input.amount,
        type: 'INCOME',
        category: 'INCOME',
        note: input.note || 'Transfer received',
        tags: ['transfer'],
        occurredAt,
        source: 'MANUAL',
        status: 'POSTED',
      },
    }),
    // Update balances
    prisma.account.update({
      where: { id: input.fromAccountId, userId },
      data: { currentBalance: { decrement: input.amount } },
    }),
    prisma.account.update({
      where: { id: input.toAccountId, userId },
      data: { currentBalance: { increment: input.amount } },
    }),
  ]);

  return { debit, credit };
}

export async function getAccountTotalBalance(userId: string): Promise<number> {
  const accounts = await prisma.account.findMany({
    where: { userId, isArchived: false },
    select: { currentBalance: true },
  });
  return accounts.reduce((sum, a) => sum + a.currentBalance, 0);
}
