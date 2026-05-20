import { z } from 'zod';

// ─── Transaction ──────────────────────────────────────────────────────────────

export const TransactionTypeEnum = z.enum(['EXPENSE', 'INCOME', 'TRANSFER', 'REFUND']);
export const TransactionCategoryEnum = z.enum([
  'FOOD', 'DRIP', 'ENTERTAINMENT', 'TRANSPORT',
  'BILLS', 'COFFEE', 'SAVINGS', 'INCOME', 'OTHER',
]);

export const CreateTransactionSchema = z.object({
  merchant:             z.string().min(1, 'Merchant is required').max(100),
  amount:               z.number().positive('Amount must be positive'),
  type:                 TransactionTypeEnum,
  category:             z.string().min(1),
  subCategory:          z.string().optional(),
  note:                 z.string().max(500).optional(),
  aiInsight:            z.string().max(500).optional(),
  tags:                 z.array(z.string()).optional().default([]),
  accountId:            z.string().optional(),
  counterpartyAccountId:z.string().optional(),
  occurredAt:           z.string().datetime().optional(),
  status:               z.enum(['POSTED', 'PENDING']).optional().default('POSTED'),
  linkedSubscriptionId: z.string().optional(),
  linkedBillId:         z.string().optional(),
});

export const TransactionFilterSchema = z.object({
  category:  z.string().optional(),
  type:      TransactionTypeEnum.optional(),
  accountId: z.string().optional(),
  from:      z.string().datetime().optional(),
  to:        z.string().datetime().optional(),
  limit:     z.coerce.number().int().min(1).max(100).default(50),
  offset:    z.coerce.number().int().min(0).default(0),
});

// ─── Account ─────────────────────────────────────────────────────────────────

export const AccountTypeEnum = z.enum([
  'CASH', 'WALLET', 'SAVINGS', 'SPENDING',
  'CREDIT_CARD_MANUAL', 'SHARED_POOL', 'EMERGENCY_FUND', 'OTHER',
]);

export const CreateAccountSchema = z.object({
  name:           z.string().min(1).max(60),
  type:           AccountTypeEnum,
  description:    z.string().max(200).optional(),
  openingBalance: z.number().default(0),
  colorTheme:     z.string().optional(),
  icon:           z.string().optional(),
});

export const UpdateAccountSchema = z.object({
  name:        z.string().min(1).max(60).optional(),
  description: z.string().max(200).optional(),
  colorTheme:  z.string().optional(),
  icon:        z.string().optional(),
  isArchived:  z.boolean().optional(),
});

export const TransferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId:   z.string().min(1),
  amount:        z.number().positive(),
  note:          z.string().optional(),
  occurredAt:    z.string().datetime().optional(),
});

// ─── Budget ───────────────────────────────────────────────────────────────────

export const BudgetScopeEnum = z.enum(['OVERALL', 'CATEGORY']);

export const CreateBudgetSchema = z.object({
  name:              z.string().min(1).max(60),
  scope:             BudgetScopeEnum,
  category:          z.string().optional(),
  amount:            z.number().positive(),
  period:            z.enum(['MONTHLY', 'WEEKLY']).default('MONTHLY'),
  startDay:          z.coerce.number().int().min(1).max(28).default(1),
  alertThresholdPct: z.number().min(0).max(100).default(80),
});

export const UpdateBudgetSchema = z.object({
  name:              z.string().min(1).max(60).optional(),
  amount:            z.number().positive().optional(),
  alertThresholdPct: z.number().min(0).max(100).optional(),
  isActive:          z.boolean().optional(),
});

// ─── Bill ─────────────────────────────────────────────────────────────────────

export const BillingCycleEnum = z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']);

export const CreateBillSchema = z.object({
  name:               z.string().min(1).max(80),
  category:           z.string().min(1),
  amountExpected:     z.number().positive().optional(),
  accountId:          z.string().optional(),
  billingCycle:       BillingCycleEnum,
  nextDueDate:        z.string().datetime(),
  autopay:            z.boolean().default(false),
  reminderDaysBefore: z.coerce.number().int().min(0).max(30).default(3),
  notes:              z.string().max(300).optional(),
});

export const UpdateBillSchema = z.object({
  name:               z.string().min(1).max(80).optional(),
  amountExpected:     z.number().positive().optional(),
  nextDueDate:        z.string().datetime().optional(),
  autopay:            z.boolean().optional(),
  status:             z.enum(['ACTIVE', 'PAUSED', 'CLOSED']).optional(),
  reminderDaysBefore: z.coerce.number().int().min(0).max(30).optional(),
  notes:              z.string().max(300).optional(),
});

export const MarkBillPaidSchema = z.object({
  amountPaid: z.number().positive(),
  accountId:  z.string().optional(),
  paidAt:     z.string().datetime().optional(),
});

// ─── Subscription ─────────────────────────────────────────────────────────────

export const CreateSubscriptionSchema = z.object({
  name:             z.string().min(1).max(80),
  provider:         z.string().min(1).max(80),
  category:         z.string().min(1),
  amount:           z.number().positive(),
  billingCycle:     BillingCycleEnum,
  nextBillingDate:  z.string().datetime(),
  accountId:        z.string().optional(),
  autopay:          z.boolean().default(false),
  notes:            z.string().max(300).optional(),
  icon:             z.string().optional(),
  colorTheme:       z.string().optional(),
});

export const UpdateSubscriptionSchema = z.object({
  name:            z.string().min(1).max(80).optional(),
  amount:          z.number().positive().optional(),
  billingCycle:    BillingCycleEnum.optional(),
  nextBillingDate: z.string().datetime().optional(),
  status:          z.enum(['ACTIVE', 'PAUSED', 'CANCELED', 'TRIAL']).optional(),
  autopay:         z.boolean().optional(),
  notes:           z.string().max(300).optional(),
  accountId:       z.string().optional(),
  icon:            z.string().optional(),
  colorTheme:      z.string().optional(),
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

export type CreateTransactionInput  = z.input<typeof CreateTransactionSchema>;
export type TransactionFilter       = z.infer<typeof TransactionFilterSchema>;
export type CreateAccountInput      = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountInput      = z.infer<typeof UpdateAccountSchema>;
export type TransferInput           = z.infer<typeof TransferSchema>;
export type CreateBudgetInput       = z.infer<typeof CreateBudgetSchema>;
export type UpdateBudgetInput       = z.infer<typeof UpdateBudgetSchema>;
export type CreateBillInput         = z.infer<typeof CreateBillSchema>;
export type UpdateBillInput         = z.infer<typeof UpdateBillSchema>;
export type MarkBillPaidInput       = z.infer<typeof MarkBillPaidSchema>;
export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;
export type CreateBucketInput       = z.infer<typeof CreateBucketSchema>;
export type UpdateBucketInput       = z.infer<typeof UpdateBucketSchema>;
export type BucketBoostInput        = z.infer<typeof BucketBoostSchema>;
export type UpdateSettingsInput     = z.infer<typeof UpdateSettingsSchema>;
