import 'dotenv/config';
import { PrismaClient, TransactionType, TransactionCategory, BucketTheme, NotificationType, Currency } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding STASH database…');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.bucket.deleteMany();
  await prisma.transaction.deleteMany();
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
      {
        userId: user.id,
        name: 'Gaming Rig',
        subtitle: 'Frames first, excuses never.',
        targetUsd: 2800,
        savedUsd: 420,
        monthlyUsd: 70,
        icon: 'sports_esports',
        theme: BucketTheme.NEUTRAL,
        isFeatured: false,
        isNew: false,
      },
      {
        userId: user.id,
        name: 'Rainy Day Buffer',
        subtitle: 'Emergency calm without the panic scroll.',
        targetUsd: 3500,
        savedUsd: 2100,
        monthlyUsd: 90,
        icon: 'shield_with_house',
        theme: BucketTheme.PRIMARY,
        isFeatured: false,
        isNew: false,
      },
      {
        userId: user.id,
        name: 'Creator Kit',
        subtitle: 'Camera, lights, and clean audio.',
        targetUsd: 1600,
        savedUsd: 960,
        monthlyUsd: 65,
        icon: 'photo_camera',
        theme: BucketTheme.SECONDARY,
        isFeatured: false,
        isNew: true,
      },
    ],
  });

  // Transactions
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        merchant: 'BALENCIAGA-RETAIL',
        amount: 1240.0,
        type: TransactionType.EXPENSE,
        category: TransactionCategory.DRIP,
        aiInsight: 'Drip budget exceeded by 12% this month.',
        tags: ['impulse', 'drip', 'big-l'],
        createdAt: hoursAgo(2),
      },
      {
        userId: user.id,
        merchant: 'PAYDAY DEPOSIT',
        amount: 3500.0,
        type: TransactionType.INCOME,
        category: TransactionCategory.INCOME,
        aiInsight: 'You saved more of this deposit than last payday.',
        tags: ['secured', 'income'],
        createdAt: hoursAgo(5),
      },
      {
        userId: user.id,
        merchant: 'BURGER REBEL',
        amount: 24.5,
        type: TransactionType.EXPENSE,
        category: TransactionCategory.FOOD,
        aiInsight: 'You spent 30% more on food this week than your usual midweek pace.',
        tags: ['overspending', 'trend-spike', 'late-night'],
        createdAt: hoursAgo(6),
      },
      {
        userId: user.id,
        merchant: 'TACO HEAVEN',
        amount: 14.2,
        type: TransactionType.EXPENSE,
        category: TransactionCategory.FOOD,
        aiInsight: 'Recurring food spend at this location.',
        tags: ['essential'],
        createdAt: daysAgo(1),
      },
      {
        userId: user.id,
        merchant: 'VIBE FESTIVAL',
        amount: 189.0,
        type: TransactionType.EXPENSE,
        category: TransactionCategory.ENTERTAINMENT,
        aiInsight: 'Entertainment spend spiked 2.1x above your weekly baseline right after payday.',
        tags: ['overspending', 'impulse-window', 'trend-spike'],
        createdAt: daysAgo(1),
      },
      {
        userId: user.id,
        merchant: 'GLITCH COFFEE',
        amount: 6.75,
        type: TransactionType.EXPENSE,
        category: TransactionCategory.COFFEE,
        aiInsight: 'Coffee is your most frequent convenience transaction.',
        tags: ['habit-loop', 'morning-trigger', 'recoverable'],
        createdAt: daysAgo(1),
      },
      {
        userId: user.id,
        merchant: 'URBAN OUTFIT',
        amount: 112.99,
        type: TransactionType.EXPENSE,
        category: TransactionCategory.DRIP,
        aiInsight: 'Apparel spending is arriving in fewer but larger purchases.',
        tags: ['overspending', 'high-basket', 'shared-cost'],
        createdAt: daysAgo(3),
      },
      {
        userId: user.id,
        merchant: 'NETFLIX',
        amount: 18.0,
        type: TransactionType.EXPENSE,
        category: TransactionCategory.ENTERTAINMENT,
        aiInsight: 'Subscription spend is consistent — consider auditing your subscriptions.',
        tags: ['subscription'],
        createdAt: daysAgo(5),
      },
      {
        userId: user.id,
        merchant: 'GRAB TRANSPORT',
        amount: 22.5,
        type: TransactionType.EXPENSE,
        category: TransactionCategory.TRANSPORT,
        tags: ['transport'],
        createdAt: daysAgo(2),
      },
      {
        userId: user.id,
        merchant: 'ELECTRIC BILL',
        amount: 85.0,
        type: TransactionType.EXPENSE,
        category: TransactionCategory.BILLS,
        tags: ['essential', 'bills'],
        createdAt: daysAgo(7),
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
        title: 'Drip budget exceeded',
        body: '12% over budget this month',
        isRead: false,
      },
      {
        userId: user.id,
        type: NotificationType.PAYDAY,
        title: 'Payday coming up!',
        body: 'Deposit scheduled in 3 days',
        link: 'dash',
        isRead: false,
      },
    ],
  });

  console.log('✅ Seed complete!');
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
