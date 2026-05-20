'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/app';

export default function LoginPage() {
  const router = useRouter();
  const showToast = useAppStore((s) => s.showToast);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const password = fd.get('password') as string;
    const name = fd.get('name') as string;

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin ? { email, password } : { email, password, name };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        showToast(isLogin ? 'Welcome back! ⚡' : 'Account created! 🎯');
        window.location.href = '/dashboard'; // force full reload to load session
      } else {
        showToast(data.error || 'Authentication failed');
      }
    } catch (err) {
      showToast('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-6xl font-black italic text-inverse-surface underline decoration-primary decoration-8 font-headline uppercase tracking-tighter select-none mb-10">
        STASH
      </div>

      <div className="bg-white border-4 border-inverse-surface hard-shadow-lg p-8 w-full max-w-md">
        <h1 className="font-headline font-black text-4xl uppercase mb-2">
          {isLogin ? 'Enter Vault' : 'Create Vault'}
        </h1>
        <p className="font-bold text-on-surface-variant text-sm mb-8">
          {isLogin ? 'Log in to track your stash.' : 'Sign up to start stashing.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block font-headline font-black text-xs uppercase tracking-widest mb-1">Name</label>
              <input 
                name="name" 
                type="text" 
                required={!isLogin} 
                className="w-full border-2 border-inverse-surface p-3 font-bold bg-surface-container focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-container transition-all" 
                placeholder="Chief Stasher"
              />
            </div>
          )}
          <div>
            <label className="block font-headline font-black text-xs uppercase tracking-widest mb-1">Email</label>
            <input 
              name="email" 
              type="email" 
              required 
              className="w-full border-2 border-inverse-surface p-3 font-bold bg-surface-container focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-container transition-all" 
              placeholder="hello@stash.app"
            />
          </div>
          <div>
            <label className="block font-headline font-black text-xs uppercase tracking-widest mb-1">Password</label>
            <input 
              name="password" 
              type="password" 
              required 
              className="w-full border-2 border-inverse-surface p-3 font-bold bg-surface-container focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-container transition-all" 
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary-container border-4 border-inverse-surface py-4 mt-6 font-headline font-black uppercase text-lg hard-shadow active-press hover:-translate-x-1 hover:-translate-y-1 transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center border-t-2 border-inverse-surface pt-6">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="font-headline font-bold text-sm uppercase underline decoration-2 hover:text-primary transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
