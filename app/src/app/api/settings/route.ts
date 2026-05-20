import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { UpdateSettingsSchema } from '@/lib/schemas';
import { getSettings, upsertSettings } from '@/services/settings';
import { ok, fail, zodFail, serverError, getUserId } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return fail('Unauthorized', 401);
    const settings = await getSettings(userId);
    return ok(settings);
  } catch (e) {
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return fail('Unauthorized', 401);

    const body     = await req.json();
    const input    = UpdateSettingsSchema.parse(body);
    const settings = await upsertSettings(userId, input);
    return ok(settings);
  } catch (e) {
    if (e instanceof ZodError) return zodFail(e);
    return serverError(e);
  }
}
