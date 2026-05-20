import { z } from 'zod';
import { getSessionUserId } from '@/lib/auth';
import { ok, fail, zodFail, serverError } from '@/lib/api';
import { updateBill, deleteBill, markBillPaid } from '@/services/bills';
import { UpdateBillSchema, MarkBillPaidSchema } from '@/lib/schemas';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return fail('Unauthorized', 401);
    const { id } = await params;
    const body = await req.json();

    // Mark paid action
    if (body._action === 'mark_paid') {
      const input = MarkBillPaidSchema.parse(body);
      const result = await markBillPaid(userId, id, input);
      return ok(result);
    }

    const input = UpdateBillSchema.parse(body);
    const bill = await updateBill(userId, id, input);
    return ok({ bill });
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
    await deleteBill(userId, id);
    return ok({ message: 'Bill closed.' });
  } catch (e) {
    return serverError(e);
  }
}
