import { db } from '@/lib/firebase-admin';
import type { CreateBucketInput, UpdateBucketInput } from '@/lib/schemas';
import { BucketTheme, Bucket } from '@/lib/types';

export async function getBuckets(userId: string): Promise<Bucket[]> {
  const snap = await db.collection('buckets')
    .where('userId', '==', userId)
    .get();

  const buckets: Bucket[] = [];
  snap.forEach((doc: any) => {
    const data = doc.data();
    buckets.push({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    } as Bucket);
  });

  // Sort: isFeatured (descending/featured first), then by createdAt (descending/newest first)
  return buckets.sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export async function getBucketById(userId: string, id: string): Promise<Bucket | null> {
  const doc = await db.collection('buckets').doc(id).get();
  if (!doc.exists || doc.data().userId !== userId) {
    return null;
  }
  const data = doc.data();
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  } as Bucket;
}

export async function createBucket(userId: string, input: CreateBucketInput): Promise<Bucket> {
  const ref = db.collection('buckets').doc();
  const now = new Date().toISOString();

  const data = {
    id:         ref.id,
    userId,
    name:       input.name,
    subtitle:   input.subtitle ?? 'Fresh goal. Clean slate. Lock in.',
    targetUsd:  input.targetUsd,
    savedUsd:   Math.min(input.savedUsd ?? 0, input.targetUsd),
    monthlyUsd: input.monthlyUsd ?? 0,
    icon:       input.icon ?? 'savings',
    theme:      (input.theme ?? 'PRIMARY') as BucketTheme,
    isFeatured: input.isFeatured ?? false,
    isNew:      true,
    createdAt:  now,
    updatedAt:  now,
  };

  await ref.set(data);

  return {
    ...data,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  } as Bucket;
}

export async function updateBucket(userId: string, id: string, input: UpdateBucketInput): Promise<Bucket | null> {
  const existing = await getBucketById(userId, id);
  if (!existing) return null;

  const targetUsd = input.targetUsd ?? existing.targetUsd;
  const savedUsd  = input.savedUsd  !== undefined
    ? Math.min(input.savedUsd, targetUsd)
    : existing.savedUsd;

  const now = new Date().toISOString();
  const updateData = {
    ...input,
    targetUsd,
    savedUsd,
    updatedAt: now,
  };

  await db.collection('buckets').doc(id).update(updateData);

  const updated = {
    ...existing,
    ...updateData,
  };

  return {
    ...updated,
    createdAt: new Date(updated.createdAt),
    updatedAt: new Date(updated.updatedAt),
  } as Bucket;
}

export async function boostBucket(userId: string, id: string, amountUsd: number): Promise<Bucket | null> {
  const bucket = await getBucketById(userId, id);
  if (!bucket) return null;

  const newSaved = Math.min(bucket.savedUsd + amountUsd, bucket.targetUsd);
  const now = new Date().toISOString();

  await db.collection('buckets').doc(id).update({
    savedUsd: newSaved,
    updatedAt: now,
  });

  return {
    ...bucket,
    savedUsd: newSaved,
    updatedAt: new Date(now),
  };
}

export async function deleteBucket(userId: string, id: string): Promise<void> {
  const ref = db.collection('buckets').doc(id);
  const snap = await ref.get();
  if (snap.exists && snap.data().userId === userId) {
    await ref.delete();
  }
}
