import { z } from 'zod';
import { getSessionUserId } from '@/lib/auth';
import { ok, fail, zodFail, serverError } from '@/lib/api';
import { getBudgets, createBudget } from '@/services/budgets';
import { CreateBudgetSchema } from '@/lib/schemas';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return fail('Unauthorized', 401);
    const budgets = await getBudgets(userId);
    return ok({ budgets });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return fail('Unauthorized', 401);
    const body = await req.json();
    const input = CreateBudgetSchema.parse(body);
    const budget = await createBudget(userId, input);
    return ok({ budget });
  } catch (e) {
    if (e instanceof z.ZodError) return zodFail(e);
    return serverError(e);
  }
}
