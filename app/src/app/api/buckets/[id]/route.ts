import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { UpdateBucketSchema, BucketBoostSchema } from '@/lib/schemas';
import { updateBucket, boostBucket, deleteBucket } from '@/services/buckets';
import { ok, fail, zodFail, serverError, getUserId } from '@/lib/api';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(req);
    if (!userId) return fail('Unauthorized', 401);

    const { id } = await params;
    const body = await req.json();
    const isBoost = 'amountUsd' in body;

    if (isBoost) {
      const { amountUsd } = BucketBoostSchema.parse(body);
      const result = await boostBucket(userId, id, amountUsd);
      if (!result) return fail('Bucket not found', 404);
      return ok(result);
    }

    const input = UpdateBucketSchema.parse(body);
    const result = await updateBucket(userId, id, input);
    if (!result) return fail('Bucket not found', 404);
    return ok(result);
  } catch (e) {
    if (e instanceof ZodError) return zodFail(e);
    return serverError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(req);
    if (!userId) return fail('Unauthorized', 401);
    const { id } = await params;
    await deleteBucket(userId, id);
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
