import { NextRequest } from 'next/server';
import { deleteTransaction } from '@/services/transactions';
import { ok, fail, serverError, getUserId } from '@/lib/api';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(req);
    if (!userId) return fail('Unauthorized', 401);
    const { id } = await params;
    await deleteTransaction(userId, id);
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
