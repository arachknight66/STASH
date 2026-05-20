import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUserId } from '@/lib/auth';
import { ok, fail, zodFail, serverError } from '@/lib/api';
import { updateAccount, deleteAccount } from '@/services/accounts';
import { UpdateAccountSchema } from '@/lib/schemas';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return fail('Unauthorized', 401);
    const { id } = await params;
    const body = await req.json();
    const input = UpdateAccountSchema.parse(body);
    const account = await updateAccount(userId, id, input);
    return ok({ account });
  } catch (e) {
    if (e instanceof z.ZodError) return zodFail(e);
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return fail('Unauthorized', 401);
    const { id } = await params;
    await deleteAccount(userId, id);
    return ok({ message: 'Account archived.' });
  } catch (e) {
    return serverError(e);
  }
}
