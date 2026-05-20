import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setAuthCookie } from '@/lib/auth';
import { AccountType, Currency } from '@prisma/client';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().substring(0, 4);
}

// Helper to seed initial user defaults (accounts, settings, notification)
async function seedUserDefaults(userId: string, name: string) {
  // 1. Settings
  await prisma.settings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      darkMode: false,
      currency: Currency.USD,
      pushNotifs: true,
      budgetAlerts: true,
    },
  });

  // 2. Default accounts
  const cashAccount = await prisma.account.create({
    data: {
      userId,
      name: 'Cash Wallet',
      type: AccountType.CASH,
      description: 'Physical cash and daily spending money.',
      openingBalance: 50.0,
      currentBalance: 50.0,
      colorTheme: '#FFBDF3',
      icon: 'payments',
    },
  });

  const walletAccount = await prisma.account.create({
    data: {
      userId,
      name: 'Main Wallet',
      type: AccountType.WALLET,
      description: 'Digital wallet and primary checking card.',
      openingBalance: 1500.0,
      currentBalance: 1500.0,
      colorTheme: '#CAFD00',
      icon: 'account_balance_wallet',
    },
  });

  // 3. Welcome notification
  await prisma.notification.create({
    data: {
      userId,
      type: 'GENERAL',
      title: 'Welcome to STASH! ⚡',
      body: `Hey ${name}! Your Vault has been set up with Cash and Main Wallets. Let's make some moves.`,
      link: 'dash',
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const urlProvider = searchParams.get('provider');

    const provider = urlProvider || state || 'google';

    let email = '';
    let name = '';

    // Handle Sandbox/Mock Login Bypass
    if (code === 'sandbox_google_user') {
      email = 'google-sandbox@stash.app';
      name = 'Google Stasher';
    } else if (code === 'sandbox_microsoft_user') {
      email = 'microsoft-sandbox@stash.app';
      name = 'Microsoft Stasher';
    } else if (!code) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?error=no_code`);
    } else {
      // Real OAuth Token Exchange Flow
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/oauth/callback`;

      if (provider === 'google') {
        const client_id = process.env.GOOGLE_CLIENT_ID;
        const client_secret = process.env.GOOGLE_CLIENT_SECRET;

        // Exchange code for Google Access Token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: client_id || '',
            client_secret: client_secret || '',
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          console.error('Google token exchange error:', errText);
          throw new Error('Google token exchange failed');
        }

        const tokens = await tokenRes.json();
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!profileRes.ok) throw new Error('Failed to fetch Google profile info');
        const profile = await profileRes.json();
        email = profile.email;
        name = profile.name || profile.given_name || 'Google User';
      } else if (provider === 'microsoft') {
        const client_id = process.env.MICROSOFT_CLIENT_ID;
        const client_secret = process.env.MICROSOFT_CLIENT_SECRET;

        // Exchange code for Microsoft Access Token
        const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: client_id || '',
            client_secret: client_secret || '',
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          console.error('Microsoft token exchange error:', errText);
          throw new Error('Microsoft token exchange failed');
        }

        const tokens = await tokenRes.json();
        const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!profileRes.ok) throw new Error('Failed to fetch Microsoft profile info');
        const profile = await profileRes.json();
        email = profile.mail || profile.userPrincipalName;
        name = profile.displayName || 'Microsoft User';
      }
    }

    if (!email) {
      throw new Error('Could not retrieve user email from identity provider');
    }

    // Upsert User in database
    let user = await prisma.user.findUnique({ where: { email } });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          email,
          name,
          initials: getInitials(name),
        },
      });
    }

    // Seed defaults if user is brand new
    if (isNewUser) {
      await seedUserDefaults(user.id, name);
    }

    // Set custom session cookie
    await setAuthCookie(user.id);

    // Redirect to dashboard
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`);
  } catch (err: any) {
    console.error('OAuth Callback Exception:', err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?error=${encodeURIComponent(err.message || 'oauth_error')}`
    );
  }
}
