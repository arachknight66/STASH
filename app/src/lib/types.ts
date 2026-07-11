// Unified Type Definitions and Enums (Replacement for @prisma/client generated types)

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER = 'TRANSFER',
  REFUND = 'REFUND',
}

export enum AccountType {
  CASH = 'CASH',
  WALLET = 'WALLET',
  SAVINGS = 'SAVINGS',
  SPENDING = 'SPENDING',
  CREDIT_CARD_MANUAL = 'CREDIT_CARD_MANUAL',
  SHARED_POOL = 'SHARED_POOL',
  EMERGENCY_FUND = 'EMERGENCY_FUND',
  OTHER = 'OTHER',
}

export enum BudgetScope {
  OVERALL = 'OVERALL',
  CATEGORY = 'CATEGORY',
}

export enum BillingCycle {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

export enum BillStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELED = 'CANCELED',
  TRIAL = 'TRIAL',
}

export enum BucketTheme {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  TERTIARY = 'TERTIARY',
  NEUTRAL = 'NEUTRAL',
}

export enum NotificationType {
  BUCKET_MILESTONE = 'BUCKET_MILESTONE',
  BUDGET_ALERT = 'BUDGET_ALERT',
  PAYDAY = 'PAYDAY',
  WEEKLY_DIGEST = 'WEEKLY_DIGEST',
  GENERAL = 'GENERAL',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  INR = 'INR',
  GBP = 'GBP',
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  passwordHash?: string | null;
  name: string;
  initials: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  description?: string | null;
  openingBalance: number;
  currentBalance: number;
  currency: Currency;
  colorTheme?: string | null;
  icon?: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId?: string | null;
  counterpartyAccountId?: string | null;
  merchant: string;
  amount: number;
  type: TransactionType;
  category: string;
  subCategory?: string | null;
  note?: string | null;
  aiInsight?: string | null;
  tags: string[];
  createdAt: Date;
  occurredAt: Date;
  updatedAt: Date;
  source: string;
  status: string;
  isRecurringCandidate: boolean;
  linkedSubscriptionId?: string | null;
  linkedBillId?: string | null;
}

export interface Budget {
  id: string;
  userId: string;
  name: string;
  scope: BudgetScope;
  category?: string | null;
  amount: number;
  period: string;
  startDay: number;
  alertThresholdPct: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bill {
  id: string;
  userId: string;
  name: string;
  category: string;
  amountExpected?: number | null;
  amountLastPaid?: number | null;
  accountId?: string | null;
  billingCycle: BillingCycle;
  nextDueDate: Date;
  autopay: boolean;
  status: BillStatus;
  reminderDaysBefore: number;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  provider: string;
  category: string;
  amount: number;
  currency: Currency;
  billingCycle: BillingCycle;
  nextBillingDate: Date;
  lastChargedAt?: Date | null;
  status: SubscriptionStatus;
  autopay: boolean;
  accountId?: string | null;
  merchantMatchRule?: string | null;
  notes?: string | null;
  icon?: string | null;
  colorTheme?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bucket {
  id: string;
  userId: string;
  name: string;
  subtitle: string;
  targetUsd: number;
  savedUsd: number;
  monthlyUsd: number;
  icon: string;
  theme: BucketTheme;
  isFeatured: boolean;
  isNew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  link?: string | null;
  createdAt: Date;
}

export interface Settings {
  id: string;
  userId: string;
  darkMode: boolean;
  currency: Currency;
  pushNotifs: boolean;
  budgetAlerts: boolean;
  hasOnboarded?: boolean;
  monthlyIncome?: number;
  updatedAt: Date;
}
