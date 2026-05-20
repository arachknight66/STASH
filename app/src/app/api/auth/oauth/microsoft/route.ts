import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/oauth/callback`;

  // Sandbox bypass if credentials are not configured
  if (!clientId || clientId === 'PLACEHOLDER') {
    console.log('⚡ Microsoft credentials missing. Redirecting to Sandbox Auth flow.');
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/oauth/callback?provider=microsoft&code=sandbox_microsoft_user`
    );
  }

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=openid%20email%20profile%20User.Read&state=microsoft`;

  return NextResponse.redirect(authUrl);
}
