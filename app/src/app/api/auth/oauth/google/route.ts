import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/oauth/callback`;

  // Sandbox bypass if credentials are not configured
  if (!clientId || clientId === 'PLACEHOLDER') {
    console.log('⚡ Google credentials missing. Redirecting to Sandbox Auth flow.');
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/oauth/callback?provider=google&code=sandbox_google_user`
    );
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=openid%20email%20profile&state=google`;

  return NextResponse.redirect(authUrl);
}
