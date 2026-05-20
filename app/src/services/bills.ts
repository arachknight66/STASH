import { prisma } from '@/lib/prisma';
import type { CreateBillInput, UpdateBillInput, MarkBillPaidInput } from '@/lib/schemas';
import { BillingCycle, BillStatus } from '@prisma/client';

export async function getBills(userId: string) {
  return prisma.bill.findMany({
    where: { userId, status: { not: BillStatus.CLOSED } },
    orderBy: { nextDueDate: 'asc' },
  });
}

export async function createBill(userId: string, input: CreateBillInput) {
  return prisma.bill.create({
    data: {
      userId,
      name:               input.name,
      category:           input.category,
      amountExpected:     input.amountExpected,
      accountId:          input.accountId,
      billingCycle:       input.billingCycle as BillingCycle,
      nextDueDate:        new Date(input.nextDueDate),
      autopay:            input.autopay,
      reminderDaysBefore: input.reminderDaysBefore,
      notes:              input.notes,
    },
  });
}

export async function updateBill(userId: string, id: string, input: UpdateBillInput) {
  return prisma.bill.update({
    where: { id, userId },
    data: {
      ...input,
      nextDueDate: input.nextDueDate ? new Date(input.nextDueDate) : undefined,
    },
  });
}

export async function deleteBill(userId: string, id: string) {
  return prisma.bill.update({
    where: { id, userId },
    data: { status: BillStatus.CLOSED },
  });
}

export async function markBillPaid(userId: string, id: string, input: MarkBillPaidInput) {
  const bill = await prisma.bill.findUnique({ where: { id, userId } });
  if (!bill) throw new Error('Bill not found');

  const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();

  // Advance to next due date based on billing cycle
  const nextDue = advanceDueDate(bill.nextDueDate, bill.billingCycle);

  // Create a linked transaction
  const tx = await prisma.transaction.create({
    data: {
      userId,
      accountId:   input.accountId ?? bill.accountId ?? undefined,
      merchant:    bill.name.toUpperCase(),
      amount:      input.amountPaid,
      type:        'EXPENSE',
      category:    bill.category,
      note:        `Bill payment: ${bill.name}`,
      tags:        ['bill', 'essential'],
      occurredAt:  paidAt,
      source:      'BILL',
      status:      'POSTED',
      linkedBillId: id,
    },
  });

  // Update bill
  await prisma.bill.update({
    where: { id, userId },
    data: {
      amountLastPaid: input.amountPaid,
      nextDueDate:    nextDue,
    },
  });

  // Update account balance if applicable
  const accountId = input.accountId ?? bill.accountId;
  if (accountId) {
    await prisma.account.update({
      where: { id: accountId, userId },
      data: { currentBalance: { decrement: input.amountPaid } },
    });
  }

  return { bill: await prisma.bill.findUnique({ where: { id } }), transaction: tx };
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
