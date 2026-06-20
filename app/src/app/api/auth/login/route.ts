import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, authAdmin } from '@/lib/firebase-admin';
import { setAuthCookie } from '@/lib/auth';
import { ok, fail, zodFail, serverError } from '@/lib/api';

const LoginSchema = z.object({
  idToken: z.string().min(1, 'ID Token is required'),
});

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().substring(0, 4);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = LoginSchema.parse(body);

    // Verify Firebase ID Token
    const decodedToken = await authAdmin.verifyIdToken(input.idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';
    const name = decodedToken.name || decodedToken.displayName || email.split('@')[0] || 'Stasher';

    // Verify or upsert user document in Firestore
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      // If user logs in with OAuth for the first time, their profile might not exist.
      // We upsert and create their default settings/accounts.
      await userRef.set({
        email,
        name,
        initials: getInitials(name),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Seed user defaults (accounts, settings, welcome notification)
      await seedUserDefaults(uid, name);
    }

    await setAuthCookie(uid);
    return ok({ message: 'Logged in successfully', uid });
  } catch (e) {
    if (e instanceof z.ZodError) return zodFail(e);
    return serverError(e);
  }
}

async function seedUserDefaults(userId: string, name: string) {
  // 1. Settings
  await db.collection('settings').doc(userId).set({
    userId,
    darkMode: false,
    currency: 'USD',
    pushNotifs: true,
    budgetAlerts: true,
    updatedAt: new Date().toISOString(),
  });

  // 2. Default accounts
  const cashRef = db.collection('accounts').doc();
  await cashRef.set({
    id: cashRef.id,
    userId,
    name: 'Cash Wallet',
    type: 'CASH',
    description: 'Physical cash and daily spending money.',
    openingBalance: 50.0,
    currentBalance: 50.0,
    colorTheme: '#FFBDF3',
    icon: 'payments',
    currency: 'USD',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const walletRef = db.collection('accounts').doc();
  await walletRef.set({
    id: walletRef.id,
    userId,
    name: 'Main Wallet',
    type: 'WALLET',
    description: 'Digital wallet and primary checking card.',
    openingBalance: 1500.0,
    currentBalance: 1500.0,
    colorTheme: '#CAFD00',
    icon: 'account_balance_wallet',
    currency: 'USD',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 3. Welcome notification
  const notifRef = db.collection('notifications').doc();
  await notifRef.set({
    id: notifRef.id,
    userId,
    type: 'GENERAL',
    title: 'Welcome to STASH! ⚡',
    body: `Hey ${name}! Your Vault has been set up with Cash and Main Wallets. Let's make some moves.`,
    link: 'dash',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
}
