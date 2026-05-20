import { NextRequest } from 'next/server';
import { getStats } from '@/services/stats';
import { ok, fail, serverError, getUserId } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return fail('Unauthorized', 401);
    const stats = await getStats(userId);
    return ok(stats);
  } catch (e) {
    return serverError(e);
  }
}
