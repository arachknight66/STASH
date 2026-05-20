import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { CreateBucketSchema } from '@/lib/schemas';
import { getBuckets, createBucket } from '@/services/buckets';
import { ok, fail, zodFail, serverError, getUserId } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return fail('Unauthorized', 401);
    const buckets = await getBuckets(userId);
    return ok(buckets);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return fail('Unauthorized', 401);

    const body   = await req.json();
    const input  = CreateBucketSchema.parse(body);
    const bucket = await createBucket(userId, input);
    return ok(bucket, 201);
  } catch (e) {
    if (e instanceof ZodError) return zodFail(e);
    return serverError(e);
  }
}
