'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app';
import { useCreateBucket, useCompleteOnboarding } from '@/hooks/useStash';
import { CURRENCIES, displayToUsd } from '@/lib/currencies';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptics } from '@/lib/haptics';

interface OnboardingWizardProps {
  userName?: string;
  onFinished: () => void;
}

const PRESETS = [
  { emoji: '✈️', label: 'Travel' },
  { emoji: '🏠', label: 'Home' },
  { emoji: '💻', label: 'Tech' },
  { emoji: '🎓', label: 'Education' },
  { emoji: '🚗', label: 'Car' },
  { emoji: '🎯', label: 'Custom' },
];

export default function OnboardingWizard({ userName = '', onFinished }: OnboardingWizardProps) {
  const currency = useAppStore((s) => s.currency);
  const showToast = useAppStore((s) => s.showToast);
  const reducedMotion = useReducedMotion();

  const completeOnboarding = useCompleteOnboarding();
  const createBucket = useCreateBucket();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [name, setName] = useState(userName);
  const [income, setIncome] = useState('');
  const [bucketName, setBucketName] = useState('');
  const [bucketTarget, setBucketTarget] = useState('');
  const [bucketEmoji, setBucketEmoji] = useState('🎯');

  const [successMode, setSuccessMode] = useState(false);

  const symbol = CURRENCIES[currency]?.symbol ?? '$';

  const handleNext = () => {
    haptics.light();
    setDirection(1);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    haptics.light();
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const finishOnboarding = async () => {
    haptics.light();
    const finalIncome = Number(income) || 0;
    
    try {
      // 1. Complete onboarding PATCH
      await completeOnboarding.mutateAsync({ monthlyIncome: finalIncome });

      // 2. Create bucket if name and target are provided
      if (bucketName.trim() && Number(bucketTarget) > 0) {
        const targetUsd = displayToUsd(Number(bucketTarget), currency);
        await createBucket.mutateAsync({
          name: bucketName.trim(),
          subtitle: `Saving up for my ${bucketName.trim()} goal.`,
          targetUsd,
          savedUsd: 0,
          monthlyUsd: Math.round(targetUsd * 0.05), // default auto-stash to 5% of target
          icon: 'savings',
          theme: 'PRIMARY',
          isFeatured: false,
        });
      }

      setSuccessMode(true);
      haptics.success();

      // Navigate to dash and close wizard after 2.5s
      setTimeout(() => {
        onFinished();
      }, 2500);
    } catch (e: any) {
      showToast(e.message || 'Onboarding failed.', 'error');
    }
  };

  // horizontal slide variants
  const slideVariants = {
    enter: (dir: number) => ({
      x: reducedMotion ? 0 : dir * 300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: reducedMotion ? 0 : -dir * 300,
      opacity: 0,
    }),
  };

  const particles = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    x: Math.random() * 400 - 200,
    y: Math.random() * -300 - 50,
    color: ['#cafd00', '#ffbdf3', '#bba2ff', '#0c0f0f', '#ffffff'][i % 5],
    size: Math.random() * 8 + 6,
    rotation: Math.random() * 360,
  }));

  if (successMode) {
    return (
      <div className="fixed inset-0 z-[200] bg-inverse-surface flex flex-col items-center justify-center text-white px-6">
        {/* Success burst & Checkmark */}
        <div className="relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="w-24 h-24 bg-[#cafd00] border-4 border-white text-inverse-surface flex items-center justify-center shrink-0 z-10 relative"
          >
            <span className="material-symbols-outlined text-5xl font-black">check</span>
          </motion.div>

          {/* Confetti particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute left-12 top-12"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
              }}
              initial={{ x: 0, y: 0, scale: 1, rotate: 0 }}
              animate={{ x: p.x, y: p.y, scale: 0, rotate: p.rotation }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          ))}
        </div>
        <h2 className="font-headline font-black text-4xl uppercase mt-8 tracking-tight text-center">
          LOCKED IN.
        </h2>
        <p className="font-body font-bold text-sm tracking-wider opacity-60 uppercase mt-2 text-center">
          Setting up your STASH dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-inverse-surface flex flex-col justify-between text-white pb-safe pt-safe">
      {/* Top Header Row */}
      <div className="px-6 pt-8 shrink-0 flex justify-between items-center">
        {/* Back button */}
        {step > 1 ? (
          <button
            onClick={handleBack}
            className="cursor-pointer text-white/60 hover:text-white flex items-center gap-1 font-headline font-bold text-xs uppercase"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span> Back
          </button>
        ) : (
          <div className="w-12" />
        )}

        {/* Progress dots */}
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-3 h-3 transition-colors ${
                s === step ? 'bg-[#cafd00]' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        <div className="w-12" />
      </div>

      {/* Main sliding wizard body */}
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full px-6 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="space-y-6"
            >
              <motion.div
                initial={reducedMotion ? {} : { opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <h1 className="font-headline font-black text-6xl italic underline decoration-[#cafd00] decoration-8 uppercase tracking-tighter leading-none select-none">
                  STASH
                </h1>
              </motion.div>
              <div className="space-y-2">
                <p className="font-headline font-black text-2xl uppercase">What should we call you?</p>
                <p className="text-xs font-bold uppercase tracking-wider opacity-50">Choose a username or your actual name.</p>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="YOUR NAME"
                className="w-full border-4 border-white bg-white/5 px-4 py-4 font-headline font-black uppercase text-xl placeholder-white/30 focus:outline-none focus:border-[#cafd00] focus:bg-white/10"
              />
              <button
                onClick={handleNext}
                disabled={!name.trim()}
                className="w-full bg-[#cafd00] text-inverse-surface border-4 border-white py-4 font-headline font-black uppercase text-base hover:-translate-y-0.5 transition-transform cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-center"
              >
                LET'S GO →
              </button>
              <div className="text-right">
                <button
                  onClick={() => {
                    setDirection(1);
                    setStep(3);
                  }}
                  className="cursor-pointer font-headline font-bold text-xs uppercase tracking-wider text-white/50 hover:text-white"
                >
                  Skip setup
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <p className="font-headline font-bold text-xs uppercase tracking-widest text-[#cafd00]">Step 2 of 3</p>
                <p className="font-headline font-black text-3xl uppercase">What's your monthly income?</p>
                <p className="text-xs font-bold uppercase tracking-wider opacity-50">Helps compute your daily burn rate and runway.</p>
              </div>

              {/* Number Input with currency symbol prefix */}
              <div className="relative flex items-center">
                <span className="absolute left-4 font-headline font-black text-3xl text-white/40">
                  {symbol}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="0.00"
                  className="w-full border-4 border-white bg-white/5 pl-12 pr-4 py-4 font-headline font-black text-3xl placeholder-white/30 focus:outline-none focus:border-[#cafd00] focus:bg-white/10"
                />
              </div>

              {/* Quick Pick Chips */}
              <div className="grid grid-cols-4 gap-2">
                {['1000', '3000', '5000', '10000'].map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      haptics.light();
                      setIncome(val);
                    }}
                    className={`border-2 border-white/40 py-2.5 font-headline font-black text-xs uppercase transition-colors hover:border-white ${
                      income === val ? 'bg-[#cafd00] text-inverse-surface border-white' : ''
                    }`}
                  >
                    {symbol}
                    {Number(val).toLocaleString()}
                  </button>
                ))}
              </div>

              <button
                onClick={handleNext}
                className="w-full bg-[#cafd00] text-inverse-surface border-4 border-white py-4 font-headline font-black uppercase text-base hover:-translate-y-0.5 transition-transform cursor-pointer text-center"
              >
                Next →
              </button>

              <div className="text-right">
                <button
                  onClick={handleNext}
                  className="cursor-pointer font-headline font-bold text-xs uppercase tracking-wider text-white/50 hover:text-white"
                >
                  Skip
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <p className="font-headline font-bold text-xs uppercase tracking-widest text-[#cafd00]">Step 3 of 3</p>
                <p className="font-headline font-black text-3xl uppercase">What are you saving for?</p>
                <p className="text-xs font-bold uppercase tracking-wider opacity-50">Create your first savings bucket goal.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={bucketName}
                  onChange={(e) => setBucketName(e.target.value)}
                  placeholder="GOAL NAME"
                  className="w-full border-4 border-white bg-white/5 px-3 py-3 font-headline font-bold text-sm uppercase placeholder-white/30 focus:outline-none focus:border-[#cafd00]"
                />
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-headline font-black text-sm text-white/40">
                    {symbol}
                  </span>
                  <input
                    type="number"
                    value={bucketTarget}
                    onChange={(e) => setBucketTarget(e.target.value)}
                    placeholder="TARGET"
                    className="w-full border-4 border-white bg-white/5 pl-8 pr-3 py-3 font-headline font-bold text-sm placeholder-white/30 focus:outline-none focus:border-[#cafd00]"
                  />
                </div>
              </div>

              {/* Horizontal presets */}
              <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      haptics.light();
                      setBucketName(p.label === 'Custom' ? '' : p.label);
                      setBucketEmoji(p.emoji);
                    }}
                    className={`flex-shrink-0 bg-white/10 border-2 border-white/30 p-3 flex flex-col items-center gap-1 min-w-[76px] hover:border-white transition-colors cursor-pointer ${
                      bucketName === p.label ? 'bg-[#cafd00] text-inverse-surface border-white' : ''
                    }`}
                  >
                    <span className="text-xl">{p.emoji}</span>
                    <span className="font-headline font-bold text-[8px] uppercase tracking-wider">{p.label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={finishOnboarding}
                className="w-full bg-[#cafd00] text-inverse-surface border-4 border-white py-4 font-headline font-black uppercase text-base hover:-translate-y-0.5 transition-transform cursor-pointer text-center"
              >
                CREATE MY FIRST BUCKET →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative footer label */}
      <div className="px-6 py-6 text-center shrink-0">
        <p className="font-headline font-bold text-[9px] uppercase tracking-[0.2em] opacity-35">
          STASH PWA GEN-Z PERSONAL FINANCE
        </p>
      </div>
    </div>
  );
}
