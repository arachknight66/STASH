import { z } from 'zod';

// ─── Transaction ──────────────────────────────────────────────────────────────

export const TransactionTypeEnum = z.enum(['EXPENSE', 'INCOME']);
export const TransactionCategoryEnum = z.enum([
  'FOOD', 'DRIP', 'ENTERTAINMENT', 'TRANSPORT',
  'BILLS', 'COFFEE', 'SAVINGS', 'INCOME', 'OTHER',
]);

export const CreateTransactionSchema = z.object({
  merchant:  z.string().min(1, 'Merchant is required').max(100),
  amount:    z.number().positive('Amount must be positive'),
  type:      TransactionTypeEnum,
  category:  TransactionCategoryEnum,
  note:      z.string().max(500).optional(),
  aiInsight: z.string().max(500).optional(),
  tags:      z.array(z.string()).optional().default([]),
});

export const TransactionFilterSchema = z.object({
  category: TransactionCategoryEnum.optional(),
  type:     TransactionTypeEnum.optional(),
  from:     z.string().datetime().optional(),
  to:       z.string().datetime().optional(),
  limit:    z.coerce.number().int().min(1).max(100).default(50),
  offset:   z.coerce.number().int().min(0).default(0),
});

// ─── Bucket ───────────────────────────────────────────────────────────────────

export const BucketThemeEnum = z.enum(['PRIMARY', 'SECONDARY', 'TERTIARY', 'NEUTRAL']);

export const CreateBucketSchema = z.object({
  name:       z.string().min(1, 'Bucket name is required').max(60),
  subtitle:   z.string().max(120).optional().default('Fresh goal. Clean slate. Lock in.'),
  targetUsd:  z.number().positive('Target must be positive'),
  savedUsd:   z.number().min(0).default(0),
  monthlyUsd: z.number().min(0).default(0),
  icon:       z.string().max(50).default('savings'),
  theme:      BucketThemeEnum.default('PRIMARY'),
  isFeatured: z.boolean().default(false),
});

export const UpdateBucketSchema = z.object({
  name:       z.string().min(1).max(60).optional(),
  subtitle:   z.string().max(120).optional(),
  savedUsd:   z.number().min(0).optional(),
  monthlyUsd: z.number().min(0).optional(),
  targetUsd:  z.number().positive().optional(),
  theme:      BucketThemeEnum.optional(),
  isFeatured: z.boolean().optional(),
  isNew:      z.boolean().optional(),
});

export const BucketBoostSchema = z.object({
  amountUsd: z.number().positive('Boost amount must be positive'),
});

// ─── Settings ─────────────────────────────────────────────────────────────────

export const CurrencyEnum = z.enum(['USD', 'EUR', 'INR', 'GBP']);

export const UpdateSettingsSchema = z.object({
  darkMode:     z.boolean().optional(),
  currency:     CurrencyEnum.optional(),
  pushNotifs:   z.boolean().optional(),
  budgetAlerts: z.boolean().optional(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type TransactionFilter      = z.infer<typeof TransactionFilterSchema>;
export type CreateBucketInput      = z.infer<typeof CreateBucketSchema>;
export type UpdateBucketInput      = z.infer<typeof UpdateBucketSchema>;
export type BucketBoostInput       = z.infer<typeof BucketBoostSchema>;
export type UpdateSettingsInput    = z.infer<typeof UpdateSettingsSchema>;
