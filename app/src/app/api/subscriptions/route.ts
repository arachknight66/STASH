import { z } from 'zod';
import { getSessionUserId } from '@/lib/auth';
import { ok, fail, zodFail, serverError } from '@/lib/api';
import { getSubscriptions, createSubscription, getSubscriptionBurden, getSuggestedSubscriptions } from '@/services/subscriptions';
import { CreateSubscriptionSchema } from '@/lib/schemas';

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return fail('Unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view');

    if (view === 'burden') {
      const burden = await getSubscriptionBurden(userId);
      return ok(burden);
    }
    if (view === 'suggestions') {
      const suggestions = await getSuggestedSubscriptions(userId);
      return ok({ suggestions });
    }

    const subscriptions = await getSubscriptions(userId);
    return ok({ subscriptions });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return fail('Unauthorized', 401);
    const body = await req.json();
    const input = CreateSubscriptionSchema.parse(body);
    const subscription = await createSubscription(userId, input);
    return ok({ subscription });
  } catch (e) {
    if (e instanceof z.ZodError) return zodFail(e);
    return serverError(e);
  }
}
