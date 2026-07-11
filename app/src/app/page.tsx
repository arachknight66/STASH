'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface MockTransaction {
  id: number;
  name: string;
  amount: number;
  unusual: boolean;
  time: string;
}

export default function LandingPage() {
  // Live Sandbox state for the interactive smartphone mockup
  const [mockBalance, setMockBalance] = useState(12450.00);
  const [mockBaliSaved, setMockBaliSaved] = useState(84); // percentage
  const [mockTransactions, setMockTransactions] = useState<MockTransaction[]>([
    { id: 1, name: 'Coffee & Boba', amount: 14.50, unusual: true, time: '2:15 PM' },
    { id: 2, name: 'Gym Membership', amount: 55.00, unusual: false, time: 'Yesterday' },
  ]);
  const [mockOffline, setMockOffline] = useState(false);
  const [activeFeature, setActiveFeature] = useState<'privacy' | 'streaks' | 'eta' | 'offline'>('privacy');

  // Interactive controls triggers
  const triggerLogBoba = () => {
    const newTx: MockTransaction = {
      id: Date.now(),
      name: 'Matcha Latte 🍵',
      amount: 6.50,
      unusual: true,
      time: 'Just now',
    };
    setMockTransactions((prev) => [newTx, ...prev.slice(0, 2)]);
    setMockBalance((prev) => prev - 6.50);
  };

  const triggerBoostBali = () => {
    setMockBaliSaved((prev) => Math.min(prev + 4, 100));
    setMockBalance((prev) => prev - 100.00);
  };

  const triggerResetSandbox = () => {
    setMockBalance(12450.00);
    setMockBaliSaved(84);
    setMockTransactions([
      { id: 1, name: 'Coffee & Boba', amount: 14.50, unusual: true, time: '2:15 PM' },
      { id: 2, name: 'Gym Membership', amount: 55.00, unusual: false, time: 'Yesterday' },
    ]);
    setMockOffline(false);
  };

  return (
    <div className="bg-[#f6f6f6] dark:bg-[#0c0f0f] text-[#0c0f0f] dark:text-[#f6f6f6] min-h-screen flex flex-col font-body selection:bg-[#cafd00] selection:text-black transition-colors duration-200">
      {/* Google-Style Neobrutalist Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0f0f10_1px,transparent_1px),linear-gradient(to_bottom,#0c0f0f10_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Navigation */}
      <nav className="border-b-4 border-inverse-surface bg-white dark:bg-[#0c0f0f] px-6 py-4 flex justify-between items-center sticky top-0 z-50 transition-colors duration-200">
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

      {/* Hero Header Area */}
      <header className="relative py-16 md:py-24 px-6 max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-12 items-center z-10">
        {/* Left Info Column */}
        <div className="md:col-span-7 flex flex-col gap-6 items-start">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#bba2ff] dark:bg-[#2b1f4d] border-2 border-inverse-surface font-headline font-black text-xs uppercase tracking-widest px-3 py-1.5 hard-shadow-sm"
          >
            ⚡ INTERACTIVE PRODUCT SANDBOX
          </motion.div>
          <h1 className="font-headline font-black text-5xl md:text-7xl uppercase leading-none tracking-tighter text-[#0c0f0f] dark:text-white">
            GET STASHED.<br />
            NOT STRAPPED.
          </h1>
          <p className="font-bold text-lg leading-relaxed opacity-80 max-w-xl">
            A privacy-first personal finance tracker with zero bank syncs. Log transactions instantly, calculate goal targets, and visual-audit subscription overheads.
          </p>

          {/* Interactive Controller Box */}
          <div className="w-full max-w-lg bg-white dark:bg-[#12161a] border-4 border-inverse-surface p-5 hard-shadow mt-2">
            <h3 className="font-headline font-black text-xs uppercase tracking-widest text-on-surface-variant mb-3 flex items-center justify-between">
              <span>TEST-DRIVE APP LIVE MOCKUP (TRY CLICKS)</span>
              <button
                onClick={triggerResetSandbox}
                className="text-[10px] font-black underline text-error hover:text-error/80 uppercase cursor-pointer"
              >
                Reset Live View
              </button>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={triggerLogBoba}
                className="bg-[#cafd00] text-black border-2 border-inverse-surface py-2.5 px-3 font-headline font-black text-xs uppercase hard-shadow-xs hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                ☕ Log $6.50 Boba
              </button>
              <button
                onClick={triggerBoostBali}
                className="bg-[#ffbdf3] text-black border-2 border-inverse-surface py-2.5 px-3 font-headline font-black text-xs uppercase hard-shadow-xs hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                🌴 Boost Bali
              </button>
              <button
                onClick={() => setMockOffline((prev) => !prev)}
                className={`${
                  mockOffline ? 'bg-error text-white' : 'bg-[#bba2ff] text-black'
                } border-2 border-inverse-surface py-2.5 px-3 font-headline font-black text-xs uppercase hard-shadow-xs hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center`}
              >
                {mockOffline ? '🔌 Go Online' : '🔌 Go Offline'}
              </button>
            </div>
          </div>

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

        {/* Right Smartphone Simulator Column */}
        <div className="md:col-span-5 flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
            className="w-[320px] h-[540px] bg-[#f6f6f6] dark:bg-[#12161a] border-4 border-[#0c0f0f] hard-shadow-lg rounded-2xl p-4 flex flex-col justify-between select-none relative overflow-hidden shrink-0 transition-colors duration-200"
          >
            {/* Phone notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-[#0c0f0f] rounded-b-xl z-20 flex items-center justify-center">
              <div className="w-12 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Offline sticky banner simulation */}
            <AnimatePresence>
              {mockOffline && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="absolute top-5 left-0 w-full bg-error text-white font-headline font-black text-[9px] uppercase tracking-wider py-1.5 px-3 border-b-2 border-black text-center z-30 flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs leading-none animate-pulse">wifi_off</span>
                  Offline Mode — Saving Locally
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mock Dashboard Header */}
            <div className="mt-4 flex justify-between items-center z-10">
              <span className="font-headline font-black text-lg italic tracking-tight dark:text-white">STASH</span>
              <span className="bg-[#cafd00] text-black text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border-2 border-black hard-shadow-sm animate-pulse">
                🔥 14 DAYS
              </span>
            </div>

            {/* Mock Main Balance */}
            <div className="bg-white dark:bg-[#1a2024] border-2 border-[#0c0f0f] p-3 hard-shadow-sm mt-3 transition-colors duration-200">
              <p className="font-headline font-black text-[9px] uppercase tracking-widest opacity-60 dark:text-white/60">
                Liquidity Vault
              </p>
              <motion.h2
                key={mockBalance}
                initial={{ scale: 0.97 }}
                animate={{ scale: 1 }}
                className="font-headline font-black text-3xl mt-0.5 tracking-tight dark:text-white"
              >
                ${mockBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </motion.h2>
            </div>

            {/* Mock Savings Bucket Card */}
            <div className="bg-[#ffbdf3] dark:bg-[#3d1a35] text-black dark:text-white border-2 border-[#0c0f0f] p-3 hard-shadow-sm mt-2 flex flex-col gap-1.5 transition-colors duration-200">
              <div className="flex justify-between items-start">
                <span className="font-headline font-black text-[10px] uppercase">🌴 Bali Getaway</span>
                <span className="font-bold text-[10px]">{mockBaliSaved}% Saved</span>
              </div>
              <div className="w-full h-2 bg-black/10 border border-black rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${mockBaliSaved}%` }}
                  transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                  className="h-full bg-[#cafd00] border-r border-black"
                />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wide opacity-70">
                📅 ETA: {mockBaliSaved >= 100 ? 'Fully Funded! 🎉' : `${Math.ceil((100 - mockBaliSaved) / 4)} Weeks`}
              </span>
            </div>

            {/* Live Feed List Simulation */}
            <div className="flex-1 overflow-hidden flex flex-col justify-start mt-2">
              <p className="font-headline font-black text-[8px] uppercase tracking-widest opacity-40 dark:text-white/40 mb-1">
                Recent Ledger
              </p>
              <div className="space-y-1.5 overflow-y-auto max-h-[170px] pr-0.5">
                <AnimatePresence initial={false}>
                  {mockTransactions.map((tx) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -30, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0, x: 30, height: 0 }}
                      className="bg-white dark:bg-[#1a2024] border-2 border-[#0c0f0f] p-2 hard-shadow-xs flex flex-col gap-0.5 transition-colors duration-200"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[10px] truncate max-w-[130px] dark:text-white">
                          {tx.name}
                        </span>
                        <span className="font-headline font-black text-xs text-error">
                          -${tx.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        {tx.unusual ? (
                          <span className="bg-[#ffbdf3] text-[#0c0f0f] text-[7px] font-black uppercase px-1 border border-[#0c0f0f]">
                            ⚠️ UNUSUAL spend
                          </span>
                        ) : (
                          <span className="text-[8px] opacity-40 uppercase font-headline font-bold dark:text-white/40">
                            Regular Card
                          </span>
                        )}
                        <span className="text-[8px] font-bold opacity-40 dark:text-white/40">{tx.time}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Mock Navigation Pill */}
            <div className="bg-[#cafd00] dark:bg-[#1e2e25] border-t-2 border-[#0c0f0f] -mx-4 -mb-4 p-2 flex justify-around items-center transition-colors duration-200">
              <span className="material-symbols-outlined text-[#0c0f0f] dark:text-white text-lg">grid_view</span>
              <span className="material-symbols-outlined text-[#0c0f0f]/40 dark:text-white/40 text-lg">receipt_long</span>
              <div className="w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center border-2 border-[#0c0f0f] shadow-inner">
                <span className="material-symbols-outlined text-white dark:text-black text-sm">add</span>
              </div>
              <span className="material-symbols-outlined text-[#0c0f0f]/40 dark:text-white/40 text-lg">savings</span>
              <span className="material-symbols-outlined text-[#0c0f0f]/40 dark:text-white/40 text-lg">autorenew</span>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Features Showcase Section (Interactive Tabs) */}
      <section className="bg-white dark:bg-[#121619] border-y-4 border-inverse-surface py-20 px-6 transition-colors duration-200">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex flex-col items-center gap-4 text-center mb-16">
            <span className="bg-[#cafd00] text-black border-2 border-inverse-surface font-headline font-black text-xs uppercase tracking-widest px-3 py-1">
              🚀 FEATURE SET
            </span>
            <h2 className="font-headline font-black text-4xl md:text-5xl uppercase tracking-tight">
              BUILT FOR ULTIMATE FINANCIAL CLARITY
            </h2>
            <p className="font-bold text-on-surface-variant max-w-xl">
              Strict privacy boundaries, gamified tracking, and proactive insight highlights. Take control.
            </p>
          </div>

          {/* Interactive Feature Selectors */}
          <div className="flex justify-center flex-wrap gap-3 mb-10">
            {['privacy', 'streaks', 'eta', 'offline'].map((feat) => {
              const labels: Record<string, string> = {
                privacy: '🔒 No Bank Logs',
                streaks: '🔥 Logging Streaks',
                eta: '🚀 Savings ETAs',
                offline: '⚡ PWA Offline Mode',
              };
              const active = activeFeature === feat;
              return (
                <button
                  key={feat}
                  onClick={() => setActiveFeature(feat as any)}
                  className={`border-2 border-inverse-surface px-5 py-3 font-headline font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    active ? 'bg-[#cafd00] text-black hard-shadow-sm -translate-y-0.5' : 'bg-surface-container text-on-surface'
                  }`}
                >
                  {labels[feat]}
                </button>
              );
            })}
          </div>

          {/* Interactive Feature Explanations Showcase */}
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              {activeFeature === 'privacy' && (
                <motion.div
                  key="privacy"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[#cafd00] text-black border-4 border-inverse-surface p-8 hard-shadow-md flex flex-col gap-4"
                >
                  <h3 className="font-headline font-black text-2xl uppercase">🔒 Strict Privacy (Zero Bank Syncs)</h3>
                  <p className="font-bold text-sm leading-relaxed opacity-90">
                    We never ask for your banking passwords. Linking bank cards can lead to data exposure. Manual transaction entry is completely private, fast, and builds a powerful mental connection with how you spend your cash.
                  </p>
                </motion.div>
              )}

              {activeFeature === 'streaks' && (
                <motion.div
                  key="streaks"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[#ffbdf3] text-black border-4 border-inverse-surface p-8 hard-shadow-md flex flex-col gap-4"
                >
                  <h3 className="font-headline font-black text-2xl uppercase">🔥 Log Streaks & Accountability</h3>
                  <p className="font-bold text-sm leading-relaxed opacity-90">
                    Log transaction items daily to grow and protect your streak counts. STASH turns finance tracking into a fun, gamified habit loop so you stay highly consistent without feeling bored.
                  </p>
                </motion.div>
              )}

              {activeFeature === 'eta' && (
                <motion.div
                  key="eta"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[#bba2ff] text-black border-4 border-inverse-surface p-8 hard-shadow-md flex flex-col gap-4"
                >
                  <h3 className="font-headline font-black text-2xl uppercase">🚀 Predicted Goal Target Dates</h3>
                  <p className="font-bold text-sm leading-relaxed opacity-90">
                    Input your target budgets and watch STASH calculate exactly when you'll fund your buckets based on income limits and monthly goal allotments. Tap "Boost" inside your dashboard to fast-track milestones.
                  </p>
                </motion.div>
              )}

              {activeFeature === 'offline' && (
                <motion.div
                  key="offline"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white text-black border-4 border-inverse-surface p-8 hard-shadow-md flex flex-col gap-4"
                >
                  <h3 className="font-headline font-black text-2xl uppercase">⚡ PWA Offline Mode</h3>
                  <p className="font-bold text-sm leading-relaxed opacity-90">
                    Underground subway rides or spotty networks won't freeze your logs. STASH relies on local caching. It stores transaction logs and setting updates locally, syncing them back to the database once connection is re-established.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full text-center flex flex-col items-center gap-8 z-10">
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
      <footer className="border-t-4 border-inverse-surface bg-white dark:bg-[#0c0f0f] py-8 px-6 text-center shrink-0 z-10 transition-colors duration-200">
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