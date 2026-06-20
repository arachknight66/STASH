import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return NextResponse.redirect(`${appUrl}/login`);
}
