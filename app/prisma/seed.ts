import 'dotenv/config';
import { PrismaClient, TransactionType, AccountType, BudgetScope, BillingCycle, BillStatus, SubscriptionStatus, BucketTheme, NotificationType, Currency } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding STASH database with deep finance models…');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.bucket.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const user = await prisma.user.create({
    data: {
      email: 'hello@stash.app',
      name: 'Stash User',
      initials: 'SF',
    },
  });

  // Settings
  await prisma.settings.create({
    data: {
      userId: user.id,
      darkMode: false,
      currency: Currency.USD,
      pushNotifs: true,
      budgetAlerts: true,
    },
  });

  // Accounts
  const pocketCash = await prisma.account.create({
    data: {
      userId: user.id,
      name: 'Pocket Cash',
      type: AccountType.CASH,
      description: 'Physical cash for daily quick spending.',
      openingBalance: 120.0,
      currentBalance: 120.0,
      currency: Currency.USD,
      colorTheme: '#FFBDF3',
      icon: 'payments',
    },
  });

  const digitalWallet = await prisma.account.create({
    data: {
      userId: user.id,
      name: 'Digital Wallet',
      type: AccountType.WALLET,
      description: 'Main debit card & online wallet.',
      openingBalance: 2450.0,
      currentBalance: 2450.0,
      currency: Currency.USD,
      colorTheme: '#CAFD00',
      icon: 'account_balance_wallet',
    },
  });

  const savingsVault = await prisma.account.create({
    data: {
      userId: user.id,
      name: 'Savings Vault',
      type: AccountType.SAVINGS,
      description: 'High-yield manual stash for goals.',
      openingBalance: 8000.0,
      currentBalance: 8000.0,
      currency: Currency.USD,
      colorTheme: '#BBA2FF',
      icon: 'shield',
    },
  });

  // Budgets
  await prisma.budget.createMany({
    data: [
      {
        userId: user.id,
        name: 'Monthly Limit',
        scope: BudgetScope.OVERALL,
        amount: 2000.0,
        period: 'MONTHLY',
        startDay: 1,
        alertThresholdPct: 80.0,
        isActive: true,
      },
      {
        userId: user.id,
        name: 'Drip Budget',
        scope: BudgetScope.CATEGORY,
        category: 'DRIP',
        amount: 600.0,
        period: 'MONTHLY',
        startDay: 1,
        alertThresholdPct: 85.0,
        isActive: true,
      },
      {
        userId: user.id,
        name: 'Food Limits',
        scope: BudgetScope.CATEGORY,
        category: 'FOOD',
        amount: 400.0,
        period: 'MONTHLY',
        startDay: 1,
        alertThresholdPct: 75.0,
        isActive: true,
      },
    ],
  });

  // Buckets
  await prisma.bucket.createMany({
    data: [
      {
        userId: user.id,
        name: 'Tokyo Trip',
        subtitle: 'Flights, food, and late-night arcade runs.',
        targetUsd: 5000,
        savedUsd: 3750,
        monthlyUsd: 260,
        icon: 'flight_takeoff',
        theme: BucketTheme.SECONDARY,
        isFeatured: false,
        isNew: false,
      },
      {
        userId: user.id,
        name: 'New Kicks',
        subtitle: 'Rotation upgrade for the next drop.',
        targetUsd: 450,
        savedUsd: 180,
        monthlyUsd: 45,
        icon: 'steps',
        theme: BucketTheme.TERTIARY,
        isFeatured: false,
        isNew: true,
      },
      {
        userId: user.id,
        name: 'Festival Fund',
        subtitle: 'Main stage, good weather, zero regrets.',
        targetUsd: 2500,
        savedUsd: 2300,
        monthlyUsd: 110,
        icon: 'festival',
        theme: BucketTheme.PRIMARY,
        isFeatured: true,
        isNew: false,
      },
    ],
  });

  // Bills
  const electricBill = await prisma.bill.create({
    data: {
      userId: user.id,
      name: 'Electric Bill',
      category: 'BILLS',
      amountExpected: 85.0,
      accountId: digitalWallet.id,
      billingCycle: BillingCycle.MONTHLY,
      nextDueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: BillStatus.ACTIVE,
      reminderDaysBefore: 3,
      notes: 'Auto-charged from checking alternative.',
    },
  });

  await prisma.bill.create({
    data: {
      userId: user.id,
      name: 'Gigabit Fiber Internet',
      category: 'BILLS',
      amountExpected: 60.0,
      accountId: digitalWallet.id,
      billingCycle: BillingCycle.MONTHLY,
      nextDueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      status: BillStatus.ACTIVE,
      reminderDaysBefore: 2,
    },
  });

  // Subscriptions
  const netflixSub = await prisma.subscription.create({
    data: {
      userId: user.id,
      name: 'Netflix Premium',
      provider: 'Netflix',
      category: 'ENTERTAINMENT',
      amount: 18.0,
      currency: Currency.USD,
      billingCycle: BillingCycle.MONTHLY,
      nextBillingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: SubscriptionStatus.ACTIVE,
      accountId: digitalWallet.id,
      merchantMatchRule: 'NETFLIX',
    },
  });

  const spotifySub = await prisma.subscription.create({
    data: {
      userId: user.id,
      name: 'Spotify Family',
      provider: 'Spotify',
      category: 'ENTERTAINMENT',
      amount: 16.99,
      currency: Currency.USD,
      billingCycle: BillingCycle.MONTHLY,
      nextBillingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: SubscriptionStatus.ACTIVE,
      accountId: digitalWallet.id,
      merchantMatchRule: 'SPOTIFY',
    },
  });

  // Transactions
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        accountId: digitalWallet.id,
        merchant: 'BALENCIAGA-RETAIL',
        amount: 1240.0,
        type: TransactionType.EXPENSE,
        category: 'DRIP',
        aiInsight: 'Drip budget exceeded by 12% this month.',
        tags: ['impulse', 'drip', 'big-l'],
        createdAt: hoursAgo(2),
        occurredAt: hoursAgo(2),
      },
      {
        userId: user.id,
        accountId: digitalWallet.id,
        merchant: 'PAYDAY DEPOSIT',
        amount: 3500.0,
        type: TransactionType.INCOME,
        category: 'INCOME',
        aiInsight: 'You saved more of this deposit than last payday.',
        tags: ['secured', 'income'],
        createdAt: hoursAgo(5),
        occurredAt: hoursAgo(5),
      },
      {
        userId: user.id,
        accountId: pocketCash.id,
        merchant: 'BURGER REBEL',
        amount: 24.5,
        type: TransactionType.EXPENSE,
        category: 'FOOD',
        aiInsight: 'You spent 30% more on food this week than your usual midweek pace.',
        tags: ['overspending', 'trend-spike', 'late-night'],
        createdAt: hoursAgo(6),
        occurredAt: hoursAgo(6),
      },
      {
        userId: user.id,
        accountId: pocketCash.id,
        merchant: 'TACO HEAVEN',
        amount: 14.2,
        type: TransactionType.EXPENSE,
        category: 'FOOD',
        aiInsight: 'Recurring food spend at this location.',
        tags: ['essential'],
        createdAt: daysAgo(1),
        occurredAt: daysAgo(1),
      },
      {
        userId: user.id,
        accountId: digitalWallet.id,
        merchant: 'VIBE FESTIVAL',
        amount: 189.0,
        type: TransactionType.EXPENSE,
        category: 'ENTERTAINMENT',
        aiInsight: 'Entertainment spend spiked 2.1x above your weekly baseline right after payday.',
        tags: ['overspending', 'impulse-window', 'trend-spike'],
        createdAt: daysAgo(1),
        occurredAt: daysAgo(1),
      },
      {
        userId: user.id,
        accountId: pocketCash.id,
        merchant: 'GLITCH COFFEE',
        amount: 6.75,
        type: TransactionType.EXPENSE,
        category: 'COFFEE',
        aiInsight: 'Coffee is your most frequent convenience transaction.',
        tags: ['habit-loop', 'morning-trigger', 'recoverable'],
        createdAt: daysAgo(1),
        occurredAt: daysAgo(1),
      },
      {
        userId: user.id,
        accountId: digitalWallet.id,
        merchant: 'URBAN OUTFIT',
        amount: 112.99,
        type: TransactionType.EXPENSE,
        category: 'DRIP',
        aiInsight: 'Apparel spending is arriving in fewer but larger purchases.',
        tags: ['overspending', 'high-basket', 'shared-cost'],
        createdAt: daysAgo(3),
        occurredAt: daysAgo(3),
      },
      {
        userId: user.id,
        accountId: digitalWallet.id,
        merchant: 'NETFLIX',
        amount: 18.0,
        type: TransactionType.EXPENSE,
        category: 'ENTERTAINMENT',
        aiInsight: 'Subscription spend is consistent — consider auditing your subscriptions.',
        tags: ['subscription'],
        createdAt: daysAgo(5),
        occurredAt: daysAgo(5),
        linkedSubscriptionId: netflixSub.id,
        source: 'SUBSCRIPTION',
      },
      {
        userId: user.id,
        accountId: digitalWallet.id,
        merchant: 'SPOTIFY',
        amount: 16.99,
        type: TransactionType.EXPENSE,
        category: 'ENTERTAINMENT',
        aiInsight: 'Recurring audio subscription.',
        tags: ['subscription'],
        createdAt: daysAgo(14),
        occurredAt: daysAgo(14),
        linkedSubscriptionId: spotifySub.id,
        source: 'SUBSCRIPTION',
      },
      {
        userId: user.id,
        accountId: digitalWallet.id,
        merchant: 'GRAB TRANSPORT',
        amount: 22.5,
        type: TransactionType.EXPENSE,
        category: 'TRANSPORT',
        tags: ['transport'],
        createdAt: daysAgo(2),
        occurredAt: daysAgo(2),
      },
      {
        userId: user.id,
        accountId: digitalWallet.id,
        merchant: 'ELECTRIC BILL',
        amount: 85.0,
        type: TransactionType.EXPENSE,
        category: 'BILLS',
        tags: ['essential', 'bills'],
        createdAt: daysAgo(7),
        occurredAt: daysAgo(7),
        linkedBillId: electricBill.id,
        source: 'BILL',
      },
      {
        userId: user.id,
        accountId: digitalWallet.id,
        merchant: 'NETFLIX',
        amount: 18.0,
        type: TransactionType.EXPENSE,
        category: 'ENTERTAINMENT',
        tags: ['subscription'],
        createdAt: daysAgo(35),
        occurredAt: daysAgo(35),
      },
      {
        userId: user.id,
        accountId: digitalWallet.id,
        merchant: 'NETFLIX',
        amount: 18.0,
        type: TransactionType.EXPENSE,
        category: 'ENTERTAINMENT',
        tags: ['subscription'],
        createdAt: daysAgo(65),
        occurredAt: daysAgo(65),
      },
      {
        userId: user.id,
        accountId: digitalWallet.id,
        merchant: 'SPOTIFY',
        amount: 16.99,
        type: TransactionType.EXPENSE,
        category: 'ENTERTAINMENT',
        tags: ['subscription'],
        createdAt: daysAgo(44),
        occurredAt: daysAgo(44),
      },
      {
        userId: user.id,
        accountId: digitalWallet.id,
        merchant: 'SPOTIFY',
        amount: 16.99,
        type: TransactionType.EXPENSE,
        category: 'ENTERTAINMENT',
        tags: ['subscription'],
        createdAt: daysAgo(74),
        occurredAt: daysAgo(74),
      },
      {
        userId: user.id,
        accountId: digitalWallet.id,
        merchant: 'CHATGPT PLUS',
        amount: 20.0,
        type: TransactionType.EXPENSE,
        category: 'OTHER',
        tags: ['ai'],
        createdAt: daysAgo(5),
        occurredAt: daysAgo(5),
      },
      {
        userId: user.id,
        accountId: digitalWallet.id,
        merchant: 'CHATGPT PLUS',
        amount: 20.0,
        type: TransactionType.EXPENSE,
        category: 'OTHER',
        tags: ['ai'],
        createdAt: daysAgo(35),
        occurredAt: daysAgo(35),
      },
      {
        userId: user.id,
        accountId: digitalWallet.id,
        merchant: 'CHATGPT PLUS',
        amount: 20.0,
        type: TransactionType.EXPENSE,
        category: 'OTHER',
        tags: ['ai'],
        createdAt: daysAgo(65),
        occurredAt: daysAgo(65),
      },
    ],
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        type: NotificationType.BUCKET_MILESTONE,
        title: 'Festival Fund is at 92%!',
        body: "You're almost there 🎪",
        link: 'buckets',
        isRead: false,
      },
      {
        userId: user.id,
        type: NotificationType.BUDGET_ALERT,
        title: 'Drip budget warning',
        body: 'You are close to blowing your Drip budget.',
        link: 'dash',
        isRead: false,
      },
      {
        userId: user.id,
        type: NotificationType.PAYDAY,
        title: 'Netflix renewal soon!',
        body: 'Netflix Premium ($18.00) renews in 3 days.',
        link: 'subs',
        isRead: false,
      },
    ],
  });

  // Update account balances to match transactions + opening balances
  await prisma.account.update({
    where: { id: pocketCash.id },
    data: { currentBalance: 120.0 - (24.5 + 14.2 + 6.75) },
  });

  await prisma.account.update({
    where: { id: digitalWallet.id },
    data: { currentBalance: 4210.55 },
  });

  console.log('✅ Seed complete with deep manual finance data models!');
  console.log(`   User: ${user.email} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
