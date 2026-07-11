'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="bg-[#f6f6f6] dark:bg-[#0c0f0f] text-[#0c0f0f] dark:text-[#f6f6f6] min-h-screen flex flex-col font-body selection:bg-[#cafd00] selection:text-black">
      {/* Navbar */}
      <nav className="border-b-4 border-inverse-surface bg-white dark:bg-[#0c0f0f] px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="text-3xl font-black italic text-inverse-surface underline decoration-[#cafd00] decoration-4 font-headline uppercase tracking-tighter select-none leading-none">
          STASH
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="border-2 border-inverse-surface bg-white dark:bg-white/10 dark:text-white px-4 py-2 font-headline font-black text-xs uppercase hover:bg-surface-container transition-colors cursor-pointer"
          >
            Log In
          </Link>
          <Link
            href="/dashboard"
            className="bg-[#cafd00] text-black border-2 border-inverse-surface px-4 py-2 font-headline font-black text-xs uppercase hard-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            Launch Vault →
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-16 md:py-24 px-6 max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-12 items-center">
        {/* Left Side: Call to Action */}
        <div className="md:col-span-7 flex flex-col gap-6 items-start">
          <div className="bg-[#bba2ff] dark:bg-[#2b1f4d] border-2 border-inverse-surface font-headline font-black text-xs uppercase tracking-widest px-3 py-1.5 hard-shadow-sm">
            ⚡ Gen-Z Personal Finance PWA
          </div>
          <h1 className="font-headline font-black text-5xl md:text-7xl uppercase leading-none tracking-tighter text-[#0c0f0f] dark:text-white">
            GET STASHED.<br />
            NOT STRAPPED.
          </h1>
          <p className="font-bold text-lg leading-relaxed opacity-80 max-w-xl">
            Take absolute control of your cash flow with zero bank logins. Track expenses manually, build dynamic savings goals, audit subscription overheads, and enjoy native haptic feedback. Offline-first, fast, and private.
          </p>
          <div className="flex flex-wrap gap-4 mt-2">
            <Link
              href="/dashboard"
              className="bg-[#cafd00] text-black border-4 border-inverse-surface px-8 py-4 font-headline font-black text-lg uppercase hard-shadow hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer"
            >
              LAUNCH THE VAULT →
            </Link>
            <Link
              href="/login"
              className="border-4 border-inverse-surface bg-white dark:bg-white/10 dark:text-white px-8 py-4 font-headline font-black text-lg uppercase hard-shadow hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer"
            >
              Create Account
            </Link>
          </div>
        </div>

        {/* Right Side: Smartphone Mockup Container */}
        <div className="md:col-span-5 flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
            className="w-[320px] h-[540px] bg-[#f6f6f6] dark:bg-[#12161a] border-4 border-[#0c0f0f] hard-shadow-lg rounded-2xl p-4 flex flex-col justify-between select-none relative overflow-hidden shrink-0"
          >
            {/* Phone notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-[#0c0f0f] rounded-b-xl z-20 flex items-center justify-center">
              <div className="w-12 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Mock Dashboard Header */}
            <div className="mt-4 flex justify-between items-center">
              <span className="font-headline font-black text-lg italic tracking-tight dark:text-white">STASH</span>
              <span className="bg-[#cafd00] text-black text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border-2 border-black hard-shadow-sm">
                🔥 14 DAYS
              </span>
            </div>

            {/* Mock Main Balance */}
            <div className="bg-white dark:bg-[#1a2024] border-2 border-[#0c0f0f] p-3 hard-shadow-sm mt-3">
              <p className="font-headline font-black text-[9px] uppercase tracking-widest opacity-60 dark:text-white/60">
                Liquidity Vault
              </p>
              <h2 className="font-headline font-black text-3xl mt-0.5 tracking-tight dark:text-white">
                $12,450.00
              </h2>
            </div>

            {/* Mock Savings Bucket Card */}
            <div className="bg-[#ffbdf3] dark:bg-[#3d1a35] text-black dark:text-white border-2 border-[#0c0f0f] p-3 hard-shadow-sm mt-2 flex flex-col gap-1.5">
              <div className="flex justify-between items-start">
                <span className="font-headline font-black text-[10px] uppercase">🌴 Bali Getaway</span>
                <span className="font-bold text-[10px]">84% Saved</span>
              </div>
              <div className="w-full h-2 bg-black/10 border border-black rounded-full overflow-hidden">
                <div className="w-[84%] h-full bg-[#cafd00] border-r border-black" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wide opacity-70">
                📅 ETA: 2 Months
              </span>
            </div>

            {/* Mock Unusual Spend Alert */}
            <div className="bg-white dark:bg-[#1a2024] border-2 border-[#0c0f0f] p-3 hard-shadow-sm mt-2 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[11px] dark:text-white">Coffee & Boba</span>
                <span className="font-headline font-black text-xs text-error">-$14.50</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-[#ffbdf3] text-[#0c0f0f] text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 border border-[#0c0f0f]">
                  ⚠️ UNUSUAL spend
                </span>
                <span className="text-[9px] font-bold opacity-50 dark:text-white/50">Today, 2:15 PM</span>
              </div>
            </div>

            {/* Mock Navigation Pill */}
            <div className="bg-[#cafd00] dark:bg-[#1e2e25] border-t-2 border-[#0c0f0f] -mx-4 -mb-4 p-2 flex justify-around items-center">
              <span className="material-symbols-outlined text-[#0c0f0f] dark:text-white text-lg">grid_view</span>
              <span className="material-symbols-outlined text-[#0c0f0f]/40 dark:text-white/40 text-lg">receipt_long</span>
              <div className="w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center border-2 border-[#0c0f0f]">
                <span className="material-symbols-outlined text-white dark:text-black text-sm">add</span>
              </div>
              <span className="material-symbols-outlined text-[#0c0f0f]/40 dark:text-white/40 text-lg">savings</span>
              <span className="material-symbols-outlined text-[#0c0f0f]/40 dark:text-white/40 text-lg">autorenew</span>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="bg-white dark:bg-[#121619] border-y-4 border-inverse-surface py-20 px-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex flex-col items-center gap-4 text-center mb-16">
            <span className="bg-[#cafd00] text-black border-2 border-inverse-surface font-headline font-black text-xs uppercase tracking-widest px-3 py-1">
              🚀 FEATURE SET
            </span>
            <h2 className="font-headline font-black text-4xl md:text-5xl uppercase tracking-tight">
              DESIGNED TO FIT YOUR FLOW
            </h2>
            <p className="font-bold text-on-surface-variant max-w-xl">
              No spreadsheets, no bloated graphs, no links to your banking portal. Just strict, fast, and visual budgeting.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-[#cafd00] text-black border-4 border-inverse-surface p-8 hard-shadow flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-3">
                <span className="material-symbols-outlined text-4xl select-none">security</span>
                <h3 className="font-headline font-black text-2xl uppercase leading-none">
                  Manual & Private
                </h3>
                <p className="font-bold text-sm leading-relaxed opacity-85">
                  Keep your banking credentials to yourself. Logging manual transactions increases mindfulness and builds positive financial habits.
                </p>
              </div>
              <div className="font-headline font-black text-[70px] leading-none opacity-10 self-end">01</div>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#ffbdf3] text-black border-4 border-inverse-surface p-8 hard-shadow flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-3">
                <span className="material-symbols-outlined text-4xl select-none">local_fire_department</span>
                <h3 className="font-headline font-black text-2xl uppercase leading-none">
                  Gamified Streaks
                </h3>
                <p className="font-bold text-sm leading-relaxed opacity-85">
                  Keep your daily spending logging hot. Accumulate logging streaks, and earn streaks to keep yourself accountable.
                </p>
              </div>
              <div className="font-headline font-black text-[70px] leading-none opacity-10 self-end">02</div>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#bba2ff] text-black border-4 border-inverse-surface p-8 hard-shadow flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-3">
                <span className="material-symbols-outlined text-4xl select-none">rocket_launch</span>
                <h3 className="font-headline font-black text-2xl uppercase leading-none">
                  Smart Goal ETAs
                </h3>
                <p className="font-bold text-sm leading-relaxed opacity-85">
                  Create savings buckets with real-time ETA estimates calculated relative to your actual monthly income constraints.
                </p>
              </div>
              <div className="font-headline font-black text-[70px] leading-none opacity-10 self-end">03</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works / CTA footer */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full text-center flex flex-col items-center gap-8">
        <h2 className="font-headline font-black text-4xl md:text-6xl uppercase tracking-tighter leading-none">
          READY TO START STASHING?
        </h2>
        <p className="font-bold text-lg max-w-xl opacity-80">
          Install the PWA app on your Android or iOS device in just a few clicks. Track online, offline, or on the go.
        </p>
        <Link
          href="/dashboard"
          className="bg-[#cafd00] text-black border-4 border-inverse-surface px-12 py-5 font-headline font-black text-xl uppercase hard-shadow hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer"
        >
          ENTER YOUR VAULT →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-inverse-surface bg-white dark:bg-[#0c0f0f] py-8 px-6 text-center shrink-0">
        <p className="font-headline font-black text-sm uppercase tracking-widest opacity-80">
          STASH PERSONAL FINANCE PWA
        </p>
        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-2">
          © {new Date().getFullYear()} STASH. PRIVACY FIRST. NO BANK SYNCS.
        </p>
      </footer>
    </div>
  );
}