import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const AUTH_COOKIE = 'stash_session';

/** Lazily resolve the signing key so the throw only happens at request time, not build time. */
function getKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is not configured in production.');
    }
    // Dev-only fallback — logged as a warning, never silently accepted in prod
    console.warn('⚠️  JWT_SECRET not set — using insecure dev fallback key.');
    return new TextEncoder().encode('dev-fallback-stash-key-unsafe');
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(userId: string) {
  return await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getKey());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getKey());
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function setAuthCookie(userId: string) {
  const token = await signToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
