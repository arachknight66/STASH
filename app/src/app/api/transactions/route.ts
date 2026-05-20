import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { TransactionFilterSchema, CreateTransactionSchema } from '@/lib/schemas';
import { getTransactions, createTransaction } from '@/services/transactions';
import { ok, fail, zodFail, serverError, getUserId } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return fail('Unauthorized', 401);

    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const filter = TransactionFilterSchema.parse(params);
    const result = await getTransactions(userId, filter);
    return ok(result);
  } catch (e) {
    if (e instanceof ZodError) return zodFail(e);
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return fail('Unauthorized', 401);

    const body  = await req.json();
    const input = CreateTransactionSchema.parse(body);
    const tx    = await createTransaction(userId, input);
    return ok(tx, 201);
  } catch (e) {
    if (e instanceof ZodError) return zodFail(e);
    return serverError(e);
  }
}
