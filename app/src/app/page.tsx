import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-body selection:bg-primary-container selection:text-on-primary-container">
      {/* Navbar */}
      <nav className="border-b-4 border-inverse-surface bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-4xl font-black italic text-inverse-surface underline decoration-primary decoration-4 font-headline uppercase tracking-tighter select-none">
            STASH
          </div>
          <div className="flex gap-4">
            <Link 
              href="/login" 
              className="bg-white border-2 border-inverse-surface px-6 py-2 font-headline font-black uppercase text-sm hard-shadow-sm hover:-translate-y-0.5 transition-transform"
            >
              Log In
            </Link>
            <Link 
              href="/login" 
              className="bg-primary-container border-2 border-inverse-surface px-6 py-2 font-headline font-black uppercase text-sm hard-shadow-sm hover:-translate-y-0.5 transition-transform"
            >
              Open Vault
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
        <div className="absolute top-10 left-10 w-64 h-64 bg-secondary-container rounded-full blur-3xl opacity-20 animate-pulse mix-blend-multiply" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-tertiary-container rounded-full blur-3xl opacity-20 animate-pulse delay-1000 mix-blend-multiply" />

        <div className="relative z-10 max-w-4xl mx-auto mt-20 mb-32">
          <h1 className="font-headline font-black text-6xl md:text-8xl tracking-tighter uppercase leading-[0.9] mb-8 text-inverse-surface drop-shadow-sm">
            YOUR MONEY.<br/>
            <span className="text-secondary">INTERPRETED.</span>
          </h1>
          <p className="font-bold text-xl md:text-2xl text-on-surface-variant max-w-2xl mx-auto mb-10">
            Stop guessing. Start tracking. Hit your savings goals and get AI-powered financial intel without the corporate fluff.
          </p>

          <Link 
            href="/login" 
            className="inline-block bg-primary-container border-4 border-inverse-surface px-12 py-6 font-headline font-black uppercase text-2xl md:text-3xl hard-shadow-lg active-press hover:-translate-x-2 hover:-translate-y-2 hover:bg-secondary-container transition-all"
          >
            START STASHING
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 pb-32">
          {[
            {
              title: "Smart Tracking",
              desc: "Log your expenses in seconds. Tag them, categorize them, and see where your money really goes.",
              color: "bg-primary-container",
              icon: "receipt_long"
            },
            {
              title: "Goal Buckets",
              desc: "Set targets. Save money. Watch your war chest grow with dynamic progress tracking.",
              color: "bg-secondary-container",
              icon: "savings"
            },
            {
              title: "AI Intel",
              desc: "Get ruthless, actionable financial insights powered by AI analyzing your real-time spending habits.",
              color: "bg-tertiary-container",
              icon: "monitoring"
            }
          ].map((feature, i) => (
            <div key={i} className={`${feature.color} border-4 border-inverse-surface p-8 text-left hard-shadow interactive-lift flex flex-col`}>
              <div className="bg-white border-2 border-inverse-surface w-16 h-16 flex items-center justify-center mb-6 rotate-3">
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>{feature.icon}</span>
              </div>
              <h3 className="font-headline font-black text-3xl uppercase tracking-tight mb-3">{feature.title}</h3>
              <p className="font-bold text-inverse-surface/80 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-inverse-surface bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="font-headline font-black text-4xl italic text-inverse-surface opacity-10 mb-4">STASH</p>
          <p className="font-bold text-sm text-on-surface-variant uppercase tracking-widest">
            © {new Date().getFullYear()} STASH FINANCIAL. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}
