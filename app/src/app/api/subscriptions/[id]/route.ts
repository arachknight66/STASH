import { z } from 'zod';
import { getSessionUserId } from '@/lib/auth';
import { ok, fail, zodFail, serverError } from '@/lib/api';
import { updateSubscription, deleteSubscription } from '@/services/subscriptions';
import { UpdateSubscriptionSchema } from '@/lib/schemas';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return fail('Unauthorized', 401);
    const { id } = await params;
    const body = await req.json();
    const input = UpdateSubscriptionSchema.parse(body);
    const subscription = await updateSubscription(userId, id, input);
    return ok({ subscription });
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
    await deleteSubscription(userId, id);
    return ok({ message: 'Subscription canceled.' });
  } catch (e) {
    return serverError(e);
  }
}
