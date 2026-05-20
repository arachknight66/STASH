import { NextRequest } from 'next/server';
import { getNotifications, markNotificationsRead } from '@/services/stats';
import { ok, fail, serverError, getUserId } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return fail('Unauthorized', 401);
    const notifications = await getNotifications(userId);
    return ok(notifications);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  // Mark all notifications as read
  try {
    const userId = await getUserId(req);
    if (!userId) return fail('Unauthorized', 401);
    await markNotificationsRead(userId);
    return ok({ cleared: true });
  } catch (e) {
    return serverError(e);
  }
}
