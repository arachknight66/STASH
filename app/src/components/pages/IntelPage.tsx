'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/app';
import { useStats, useIntel } from '@/hooks/useStash';
import { formatMoney, formatCompactMoney } from '@/lib/currencies';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';

const BAR_COLORS = ['bg-primary-container', 'bg-secondary-container', 'bg-tertiary-container', 'bg-surface-variant'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } }
} as const;

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export default function IntelPage() {
  const currency  = useAppStore((s) => s.currency);
  const showToast = useAppStore((s) => s.showToast);
  const { data: stats } = useStats();
  const { data: intel, isLoading: intelLoading, isFetching } = useIntel();
  const qc = useQueryClient();
  const [focusBar, setFocusBar] = useState(0);

  // Live Chat Terminal State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Yo. I'm STASH, your AI personal finance coach. I know exactly how much cash you're blowing. Ask me anything, or type 'help' if you're cooked." }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dailyBurn    = stats?.dailyBurn    ?? 0;
  const runway       = stats?.runway       ?? 0;
  const recoveryMove = stats?.recoveryMove ?? 0;
  const netWorth     = stats?.netWorth     ?? 0;
  const monthlySpend = stats?.monthlySpend ?? 0;
  const breakdown    = stats?.categoryBreakdown ?? {};

  // Scroll to bottom on new chat messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    if (trimmed.toLowerCase() === 'help') {
      setChatMessages(prev => [
        ...prev,
        { role: 'user', text: trimmed },
        { role: 'model', text: "COMMANDS:\n- 'vibe': Triggers a live vibe check of your spending habits.\n- 'summary': Breaks down where your money went.\n- Or just ask: 'Did I spend too much on food?' / 'How is my savings runway?'" }
      ]);
      setChatInput('');
      return;
    }

    if (trimmed.toLowerCase() === 'vibe') {
      setChatMessages(prev => [
        ...prev,
        { role: 'user', text: trimmed },
        { role: 'model', text: intel?.vibeCheck || "You haven't logged enough transactions for a vibe check. Go track your spend, bestie!" }
      ]);
      setChatInput('');
      return;
    }

    if (trimmed.toLowerCase() === 'summary') {
      setChatMessages(prev => [
        ...prev,
        { role: 'user', text: trimmed },
        { role: 'model', text: `TOTAL DAMAGE: ${formatMoney(monthlySpend, currency)}\nDAILY BURN: ${formatMoney(dailyBurn, currency)}/day\nRUNWAY: ${runway} days left.` }
      ]);
      setChatInput('');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', text: trimmed };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/intel/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: chatMessages
        })
      });
      const data = await response.json();
      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'model', text: data.data.text }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'model', text: `ERROR: ${data.error || 'Failed to connect to STASH processor.'}` }]);
      }
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'model', text: `SYSTEM ERR: Connection timed out. Details: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Build chart bars from real category breakdown
  const bars = Object.entries(breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([label, amount]) => ({
      label,
      amount,
      pct: monthlySpend > 0 ? Math.round((amount / monthlySpend) * 100) : 0,
    }));

  const focused = bars[focusBar] ?? bars[0];

  return (
    <motion.main
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="px-4 pt-8 max-w-5xl mx-auto pb-12"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-2 mb-8">
        <h1 className="text-6xl font-black font-headline tracking-tighter text-inverse-surface uppercase">INTEL</h1>
        <p className="font-bold text-on-surface-variant uppercase tracking-[0.18em] text-xs">AI-powered financial analysis & coach terminal</p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Daily Burn',    value: formatMoney(dailyBurn, currency), bg: 'bg-primary-container',   sub: 'Average spend per day.' },
          { label: 'Budget Runway', value: `${runway} days`,                 bg: 'bg-secondary-container', sub: 'How long your pace stays comfy.' },
          { label: 'Recovery Move', value: formatMoney(recoveryMove, currency, { maximumFractionDigits: 0 }), bg: 'bg-tertiary-container', sub: 'Quick win from trimming top category.' },
        ].map(({ label, value, bg, sub }) => (
          <div key={label} className={`interactive-lift ${bg} border-4 border-inverse-surface p-5 hard-shadow`}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">{label}</p>
            <p className="font-headline font-black text-4xl mt-2">{value}</p>
            <p className="text-xs font-bold mt-2 text-on-surface-variant">{sub}</p>
          </div>
        ))}
      </motion.div>

      {/* Main Split Layout */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Retro DOS Terminal Chat (Left Column) */}
        <div className="lg:col-span-7 bg-black border-4 border-inverse-surface hard-shadow-lg flex flex-col h-[480px] overflow-hidden">
          {/* DOS Window Header */}
          <div className="bg-inverse-surface text-white dark:text-black dark:bg-white px-4 py-2 flex justify-between items-center border-b-4 border-inverse-surface select-none">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">terminal</span>
              <span className="font-mono text-xs font-black uppercase tracking-wider">STASH_COACH.EXE v2.0</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold">
              <div className="w-5 h-5 border border-white dark:border-black flex items-center justify-center cursor-pointer hover:bg-white/20 select-none">_</div>
              <div className="w-5 h-5 border border-white dark:border-black flex items-center justify-center cursor-pointer hover:bg-white/20 select-none">🗖</div>
              <div className="w-5 h-5 border border-white dark:border-black flex items-center justify-center cursor-pointer hover:bg-red-500 hover:text-white select-none">X</div>
            </div>
          </div>

          {/* Chat Messages Log */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto font-mono text-xs md:text-sm space-y-4 bg-black text-[#00ff66] terminal-scrollbar">
            <div>
              <span className="text-[#cafd00] font-black">[SYSTEM]:</span> INJECTING TRANSACTION DATA...
            </div>
            <div>
              <span className="text-[#cafd00] font-black">[SYSTEM]:</span> RADICAL FINANCIAL COACH ENGAGED.
            </div>
            {chatMessages.map((msg, i) => {
              const isAi = msg.role === 'model';
              return (
                <div key={i} className="leading-relaxed whitespace-pre-wrap">
                  <span className={`${isAi ? 'text-[#cafd00]' : 'text-[#ffbdf3]'} font-black`}>
                    {isAi ? '[STASH]:' : '[YOU]:'}
                  </span>{' '}
                  {msg.text}
                </div>
              );
            })}
            {chatLoading && (
              <div className="flex items-center gap-1 text-[#cafd00] pulse-sync">
                <span>[STASH]:</span>
                <span className="animate-pulse">Thinking no cap...</span>
              </div>
            )}
          </div>

          {/* DOS Type-In Console */}
          <form onSubmit={handleSendChat} className="border-t-4 border-inverse-surface bg-black p-3 flex items-center gap-2 font-mono">
            <span className="text-[#00ff66] font-bold">&gt;</span>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
              placeholder="Ask STASH about your budget or type 'help'..."
              className="flex-1 bg-transparent text-[#00ff66] outline-none border-none placeholder-gray-700 caret-[#00ff66] text-sm font-mono"
            />
            <button
              type="submit"
              disabled={chatLoading}
              className="bg-[#cafd00] text-black border-2 border-inverse-surface px-4 py-1.5 font-headline font-black text-xs uppercase hover:bg-white transition-colors active-press cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              RUN
            </button>
          </form>
        </div>

        {/* Spotlit Bar Chart (Right Column) */}
        <div className="lg:col-span-5 bg-white border-4 border-inverse-surface p-6 hard-shadow-lg flex flex-col justify-between h-[480px]">
          <div>
            <div className="flex justify-between items-start mb-6 flex-wrap gap-2">
              <div>
                <h2 className="text-2xl font-black font-headline uppercase leading-none mb-1">Where did it go?</h2>
                <p className="font-bold text-on-surface-variant opacity-70 text-sm">TOTAL DAMAGE: {formatMoney(monthlySpend, currency)}</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-[#bba2ff]" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
            </div>
            {bars.length === 0 ? (
              <div className="h-48 flex items-center justify-center">
                <p className="font-bold text-on-surface-variant text-sm">No spending data yet.</p>
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between h-44 gap-3 mb-6">
                  {bars.map((bar, i) => (
                    <div key={bar.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setFocusBar(i);
                          setChatInput(`Analyze my ${bar.label.toLowerCase()} spending`);
                        }}
                        onMouseEnter={() => setFocusBar(i)}
                        onFocus={() => setFocusBar(i)}
                        className={`w-full ${BAR_COLORS[i]} border-4 border-inverse-surface relative cursor-pointer hover:opacity-85 transition-all ${focusBar === i ? 'hard-shadow-sm -translate-y-2' : ''}`}
                        style={{ height: `${Math.max(12, bar.pct)}%` }}
                      >
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 font-black text-xs whitespace-nowrap bg-white border border-black px-1">
                          {formatCompactMoney(bar.amount, currency)}
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-center leading-tight truncate w-full" title={bar.label}>
                        {bar.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-surface-container p-3 border-2 border-inverse-surface text-xs font-bold leading-normal">
                  <p className="uppercase font-black text-secondary tracking-wider mb-1">💡 Spotlit interactive insight</p>
                  Click a category bar to investigate it in the DOS Terminal! Currently focusing: <span className="font-black text-primary-dim">{focused?.label.toUpperCase()}</span> ({focused?.pct}% of monthly damage).
                </div>
              </>
            )}
          </div>
          
          <div className="bg-primary-container border-2 border-inverse-surface p-3 flex items-center justify-between hard-shadow-sm mt-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#bba2ff]" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider opacity-75 leading-none">Net Worth Clout</p>
                <p className="font-headline font-black text-xl mt-0.5">{formatMoney(netWorth, currency)}</p>
              </div>
            </div>
            <button
              onClick={() => { qc.invalidateQueries({ queryKey: ['stats'] }); showToast('Net worth status synced.'); }}
              className="border border-black bg-white px-2 py-1 text-[10px] font-black uppercase cursor-pointer hover:bg-black hover:text-white transition-colors"
            >
              SYNC
            </button>
          </div>
        </div>
      </motion.div>

      {/* AI Pro Insight & Tips (Bottom Segment) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Vibe Check and Pro Insight banner */}
        <div className="md:col-span-12 relative border-4 border-inverse-surface bg-inverse-surface text-white p-6 hard-shadow-lg overflow-hidden hover-glow">
          <div className="absolute right-[-15px] bottom-[-15px] opacity-10 rotate-12">
            <span className="material-symbols-outlined text-[150px]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <span className="bg-primary text-on-primary px-3 py-1 font-black text-xs uppercase mb-3 inline-block tracking-wider">AI VIBE CHECK</span>
              <h2 className="text-3xl font-black text-white font-headline uppercase leading-none mb-3">
                {intelLoading ? 'STASH IS VIBING...' : (intel?.summary || 'Log some spending to unlock insight.')}
              </h2>
              <p className="text-white font-bold opacity-80 max-w-2xl text-sm md:text-base leading-relaxed">
                {intelLoading ? 'Calculating spending vibes...' : (intel?.vibeCheck || 'Your AI coach needs transaction data to roast you properly.')}
              </p>
            </div>
            <div className="flex flex-col gap-2 min-w-[200px]">
              <button
                onClick={() => { qc.invalidateQueries({ queryKey: ['intel'] }); showToast('Refreshing AI engine... 🧠'); }}
                disabled={isFetching}
                className="w-full bg-[#cafd00] text-black py-3 px-4 font-black uppercase text-xs border-2 border-black hard-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isFetching ? 'ANALYZING...' : 'REFRESH INSIGHTS'}
              </button>
              <div className="bg-white/10 p-3 border border-white/20 text-xs font-mono">
                <span className="font-bold block text-primary mb-1">PRO INSIGHT:</span>
                {intel?.proInsight || 'Trim categories by 20% to build massive runway.'}
              </div>
            </div>
          </div>
        </div>

        {/* AI Tips */}
        {intel?.tips && intel.tips.length > 0 && (
          <div className="md:col-span-12 bg-white border-4 border-inverse-surface p-6 hard-shadow">
            <h3 className="font-headline font-black text-xl uppercase mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ffbdf3]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              AI ACTION TIPS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {intel.tips.slice(0, 3).map((tip, i) => (
                <div key={i} className={`${BAR_COLORS[i] ?? 'bg-surface-container'} border-2 border-inverse-surface p-4 hard-shadow-sm`}>
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-mono font-black text-sm mb-3">0{i+1}</div>
                  <p className="font-bold text-sm leading-normal">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.main>
  );
}
