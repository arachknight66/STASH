'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/app';

export default function NotFound() {
  const darkMode = useAppStore((s) => s.darkMode);

  // Sync dark mode class on <html> globally
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className="bg-[#f6f6f6] dark:bg-[#0c0f0f] text-[#0c0f0f] dark:text-[#f6f6f6] min-h-screen flex flex-col items-center justify-center font-body selection:bg-[#cafd00] selection:text-black transition-colors duration-200 px-6 relative z-0">
      {/* Google-Style Neobrutalist Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0f0f10_1px,transparent_1px),linear-gradient(to_bottom,#0c0f0f10_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-[-1]" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto gap-8 mt-[-10vh]">
        <div className="bg-[#ffbdf3] text-black border-4 border-inverse-surface px-4 py-2 font-headline font-black text-sm uppercase tracking-widest hard-shadow-sm">
          ERROR 404
        </div>

        <h1 className="font-headline font-black text-6xl md:text-8xl lg:text-9xl uppercase leading-none tracking-tighter text-[#0c0f0f] dark:text-white">
          PAGE STASHED
        </h1>

        <p className="font-bold text-xl md:text-2xl leading-relaxed opacity-80">
          Looks like this page doesn't exist, or it got stashed somewhere else.
        </p>

        <Link
          href="/"
          className="bg-[#cafd00] text-black border-4 border-inverse-surface px-8 py-4 font-headline font-black text-lg uppercase hard-shadow hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer mt-4 inline-block"
        >
          ← BACK TO BASE
        </Link>
      </div>
    </div>
  );
}
