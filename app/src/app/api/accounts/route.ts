import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUserId } from '@/lib/auth';
import { ok, fail, zodFail, serverError } from '@/lib/api';
import { getAccounts, createAccount, transferBetweenAccounts } from '@/services/accounts';
import { CreateAccountSchema, TransferSchema } from '@/lib/schemas';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return fail('Unauthorized', 401);
    const accounts = await getAccounts(userId);
    return ok({ accounts });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return fail('Unauthorized', 401);

    const body = await req.json();

    // Handle transfer action
    if (body._action === 'transfer') {
      const input = TransferSchema.parse(body);
      const result = await transferBetweenAccounts(userId, input);
      return ok(result);
    }

    const input = CreateAccountSchema.parse(body);
    const account = await createAccount(userId, input);
    return ok({ account });
  } catch (e) {
    if (e instanceof z.ZodError) return zodFail(e);
    return serverError(e);
  }
}
