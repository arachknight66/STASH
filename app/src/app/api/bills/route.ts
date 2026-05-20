import { z } from 'zod';
import { getSessionUserId } from '@/lib/auth';
import { ok, fail, zodFail, serverError } from '@/lib/api';
import { getBills, createBill } from '@/services/bills';
import { CreateBillSchema } from '@/lib/schemas';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return fail('Unauthorized', 401);
    const bills = await getBills(userId);
    return ok({ bills });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return fail('Unauthorized', 401);
    const body = await req.json();
    const input = CreateBillSchema.parse(body);
    const bill = await createBill(userId, input);
    return ok({ bill });
  } catch (e) {
    if (e instanceof z.ZodError) return zodFail(e);
    return serverError(e);
  }
}
