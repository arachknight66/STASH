'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/app';
import { motion } from 'framer-motion';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

// Determine if we're in sandbox/mock mode (no real Firebase credentials)
function isMockMode(): boolean {
  return (
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'mock-api-key-unsafe'
  );
}

export default function LoginPage() {
  const showToast = useAppStore((s) => s.showToast);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // ── Google OAuth ───────────────────────────────────────────────────────
  async function handleGoogleLogin() {
    setLoading(true);
    try {
      let idToken = '';

      if (isMockMode()) {
        idToken = 'sandbox_google_user';
      } else {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        idToken = await result.user.getIdToken();
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (data.success) {
        showToast('Welcome back! ⚡', 'success');
        window.location.href = '/dashboard';
      } else {
        showToast(data.error || 'Authentication failed.', 'error');
      }
    } catch (e: any) {
      console.error('Google login error:', e);
      showToast(e.message || 'Google sign-in failed.', 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── Email / password ───────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const password = fd.get('password') as string;
    const name = fd.get('name') as string;

    try {
      let idToken = '';

      if (isMockMode()) {
        const uid = `mock-user-${email.replace(/[^a-zA-Z0-9]/g, '-')}`;
        idToken = `mock-token:${uid}:${email}:${name || 'Stasher'}`;
      } else {
        if (isLogin) {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          idToken = await cred.user.getIdToken();
        } else {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          idToken = await cred.user.getIdToken();
        }
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin ? { idToken } : { idToken, name };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        showToast(isLogin ? 'Welcome back! ⚡' : 'Vault created! 🎯', 'success');
        window.location.href = '/dashboard';
      } else {
        showToast(data.error || 'Authentication failed.', 'error');
      }
    } catch (e: any) {
      console.error('Auth error:', e);
      // Surface Firebase error codes in a human-friendly way
      const msg =
        e.code === 'auth/wrong-password' ? 'Incorrect password. Try again.'
          : e.code === 'auth/user-not-found' ? 'No account with that email.'
            : e.code === 'auth/email-already-in-use' ? 'Email already in use. Log in instead.'
              : e.code === 'auth/weak-password' ? 'Password must be at least 6 characters.'
                : e.message || 'Something went wrong.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        className="text-6xl font-black italic text-inverse-surface underline decoration-primary decoration-8 font-headline uppercase tracking-tighter select-none mb-10"
        aria-label="STASH"
      >
        STASH
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white dark:bg-[#161d22] border-4 border-inverse-surface hard-shadow-lg p-8 w-full max-w-md"
      >
        {/* Heading */}
        <h1 className="font-headline font-black text-4xl uppercase mb-1">
          {isLogin ? 'Enter Vault' : 'Create Vault'}
        </h1>
        <p className="font-bold text-on-surface-variant text-sm mb-8">
          {isLogin ? 'Log in to track your stash.' : 'Sign up to start stashing.'}
        </p>

        {/* Google button */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            aria-label="Continue with Google"
            className="w-full flex items-center justify-center gap-3 border-4 border-inverse-surface py-3 font-headline font-black text-sm uppercase bg-white dark:bg-[#1d252b] hard-shadow hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0"
          >
            {/* Google logo SVG */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6" aria-hidden="true">
          <div className="flex-1 h-[2px] bg-inverse-surface opacity-15" />
          <span className="font-black text-xs uppercase tracking-widest opacity-40">or</span>
          <div className="flex-1 h-[2px] bg-inverse-surface opacity-15" />
        </div>

        {/* Email / password form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Name field — only shown on register */}
          {!isLogin && (
            <div>
              <label
                htmlFor="name"
                className="block font-headline font-black text-xs uppercase tracking-widest mb-1"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required={!isLogin}
                autoComplete="name"
                autoCapitalize="words"
                disabled={loading}
                className="w-full border-2 border-inverse-surface p-3 font-bold bg-surface-container dark:bg-[#1d252b] dark:text-white focus:bg-white dark:focus:bg-[#262e36] focus:outline-none focus:ring-4 focus:ring-primary-container transition-all disabled:opacity-60"
                placeholder="Chief Stasher"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block font-headline font-black text-xs uppercase tracking-widest mb-1"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              disabled={loading}
              className="w-full border-2 border-inverse-surface p-3 font-bold bg-surface-container dark:bg-[#1d252b] dark:text-white focus:bg-white dark:focus:bg-[#262e36] focus:outline-none focus:ring-4 focus:ring-primary-container transition-all disabled:opacity-60"
              placeholder="hello@stash.app"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block font-headline font-black text-xs uppercase tracking-widest mb-1"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              disabled={loading}
              className="w-full border-2 border-inverse-surface p-3 font-bold bg-surface-container dark:bg-[#1d252b] dark:text-white focus:bg-white dark:focus:bg-[#262e36] focus:outline-none focus:ring-4 focus:ring-primary-container transition-all disabled:opacity-60"
              placeholder="••••••••"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container border-4 border-inverse-surface py-4 mt-2 font-headline font-black uppercase text-lg hard-shadow active-press hover:-translate-x-1 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 cursor-pointer relative overflow-hidden"
          >
            {/* Loading bar — slides across the button bottom edge */}
            {loading && (
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-inverse-surface/30"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.5, ease: 'linear' }}
              />
            )}
            {loading
              ? (isLogin ? 'Entering vault...' : 'Creating vault...')
              : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        {/* Toggle login/register */}
        <div className="mt-6 text-center border-t-2 border-inverse-surface pt-6">
          <button
            type="button"
            onClick={() => setIsLogin((p) => !p)}
            disabled={loading}
            className="font-headline font-bold text-sm uppercase underline decoration-2 hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : 'Already have an account? Log in'}
          </button>
        </div>
      </motion.div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mt-6 text-xs font-bold opacity-30 uppercase tracking-widest text-center"
      >
        Privacy-first · No bank sync · Your stash, your rules.
      </motion.p>
    </div>
  );
}