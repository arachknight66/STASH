import { prisma } from '@/lib/prisma';
import type { CreateBucketInput, UpdateBucketInput } from '@/lib/schemas';
import type { BucketTheme } from '@prisma/client';

export async function getBuckets(userId: string) {
  return prisma.bucket.findMany({
    where: { userId },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getBucketById(userId: string, id: string) {
  return prisma.bucket.findFirst({ where: { id, userId } });
}

export async function createBucket(userId: string, input: CreateBucketInput) {
  return prisma.bucket.create({
    data: {
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
    },
  });
}

export async function updateBucket(userId: string, id: string, input: UpdateBucketInput) {
  const existing = await getBucketById(userId, id);
  if (!existing) return null;

  const targetUsd = input.targetUsd ?? existing.targetUsd;
  const savedUsd  = input.savedUsd  !== undefined
    ? Math.min(input.savedUsd, targetUsd)
    : existing.savedUsd;

  return prisma.bucket.update({
    where: { id },
    data: {
      name:       input.name,
      subtitle:   input.subtitle,
      targetUsd,
      savedUsd,
      monthlyUsd: input.monthlyUsd,
      theme:      input.theme as BucketTheme | undefined,
      isFeatured: input.isFeatured,
      isNew:      input.isNew,
    },
  });
}

export async function boostBucket(userId: string, id: string, amountUsd: number) {
  const bucket = await getBucketById(userId, id);
  if (!bucket) return null;

  const newSaved = Math.min(bucket.savedUsd + amountUsd, bucket.targetUsd);
  return prisma.bucket.update({
    where: { id },
    data: { savedUsd: newSaved },
  });
}

export async function deleteBucket(userId: string, id: string) {
  return prisma.bucket.delete({ where: { id, userId } });
}
