"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";

const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#818cf8" strokeWidth="1.8" strokeLinejoin="round"/>
        <polyline points="14,2 14,8 20,8" stroke="#818cf8" strokeWidth="1.8" strokeLinejoin="round"/>
        <line x1="16" y1="13" x2="8" y2="13" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="16" y1="17" x2="8" y2="17" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round"/>
        <polyline points="10,9 9,9 8,9" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    title: "Upload Documents",
    desc: "Drop PDFs, Word docs, spreadsheets — any format. Our AI ingests and indexes in seconds.",
    color: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.22)",
    glow: "rgba(99,102,241,0.08)",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#a78bfa" strokeWidth="1.8" strokeLinejoin="round"/>
        <circle cx="9" cy="10" r="1" fill="#c084fc"/>
        <circle cx="12" cy="10" r="1" fill="#c084fc"/>
        <circle cx="15" cy="10" r="1" fill="#c084fc"/>
      </svg>
    ),
    title: "Chat Naturally",
    desc: "Ask questions in plain language. Get cited, precise answers drawn directly from your documents.",
    color: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.22)",
    glow: "rgba(139,92,246,0.08)",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke="#34d399" strokeWidth="1.8"/>
        <path d="m21 21-4.35-4.35" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M8 11h6M11 8v6" stroke="#6ee7b7" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    title: "Instant Search",
    desc: "Semantic search across all your documents. Find the exact paragraph, table, or clause instantly.",
    color: "rgba(52,211,153,0.1)",
    border: "rgba(52,211,153,0.2)",
    glow: "rgba(52,211,153,0.06)",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="11" width="18" height="11" rx="2" stroke="#f472b6" strokeWidth="1.8"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#f472b6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="16" r="1.5" fill="#f9a8d4"/>
      </svg>
    ),
    title: "Secure & Private",
    desc: "End-to-end encryption, zero data retention. Your docs stay yours — always.",
    color: "rgba(236,72,153,0.1)",
    border: "rgba(236,72,153,0.2)",
    glow: "rgba(236,72,153,0.06)",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#fbbf24" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Lightning Fast",
    desc: "Responses in under a second. Powered by the latest LLM inference infrastructure.",
    color: "rgba(251,191,36,0.1)",
    border: "rgba(251,191,36,0.2)",
    glow: "rgba(251,191,36,0.06)",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="#38bdf8" strokeWidth="1.8"/>
        <polyline points="3.27,6.96 12,12.01 20.73,6.96" stroke="#7dd3fc" strokeWidth="1.8"/>
        <line x1="12" y1="22.08" x2="12" y2="12" stroke="#7dd3fc" strokeWidth="1.8"/>
      </svg>
    ),
    title: "Multi-Doc Analysis",
    desc: "Cross-reference multiple documents simultaneously. Perfect for research and due diligence.",
    color: "rgba(56,189,248,0.1)",
    border: "rgba(56,189,248,0.2)",
    glow: "rgba(56,189,248,0.06)",
  },
];

const stats = [
  { value: "99.9%", label: "Uptime SLA" },
  { value: "<1s", label: "Avg Response" },
  { value: "50+", label: "File Formats" },
  { value: "256-bit", label: "Encryption" },
];

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const cards = heroRef.current.querySelectorAll<HTMLElement>(".feature-card");
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--mouse-x", `${x}%`);
        card.style.setProperty("--mouse-y", `${y}%`);
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div ref={heroRef} className="relative overflow-hidden">
      {/* ── Ambient background orbs ── */}
      <div className="pointer-events-none select-none fixed inset-0 overflow-hidden">
        <div
          className="animate-orb-1 absolute"
          style={{
            top: "-10%", left: "-5%",
            width: "700px", height: "700px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="animate-orb-2 absolute"
          style={{
            top: "30%", right: "-10%",
            width: "600px", height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
        <div
          className="animate-orb-3 absolute"
          style={{
            bottom: "5%", left: "30%",
            width: "500px", height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        {/* Grid overlay */}
        <div
          style={{
            position: "absolute", inset: 0,
            backgroundImage: `linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 0%, black 40%, transparent 100%)",
          }}
        />
      </div>

      {/* ── HERO ── */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[92vh] px-6 pt-16 pb-24 text-center">
        {/* Badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 glass border border-indigo-500/20 text-sm text-indigo-300 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Now with GPT-4o — try it free
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{opacity:0.7}}>
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Main heading */}
        <h1 className="animate-fade-up delay-100 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[1.06] tracking-tight max-w-5xl">
          <span className="text-white">Chat with your</span>
          <br />
          <span className="text-gradient animate-shimmer-text">documents.</span>
          <br />
          <span className="text-white/80 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold">Instantly.</span>
        </h1>

        {/* Subheading */}
        <p className="animate-fade-up delay-200 mt-7 text-base sm:text-lg md:text-xl text-white/50 max-w-2xl leading-relaxed font-light">
          Upload any document, ask anything in plain English, and get accurate,
          cited answers powered by state-of-the-art AI. No more manual searching.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-up delay-300 flex flex-wrap items-center justify-center gap-4 mt-10">
          <Link
            href="/signup"
            className="btn-primary shimmer-btn relative overflow-hidden inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-white font-semibold text-base shadow-2xl"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            Get started free
          </Link>
          <Link
            href="/login"
            className="btn-secondary inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-white/80 font-semibold text-base"
          >
            Sign in
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        {/* Trust note */}
        <p className="animate-fade-up delay-400 mt-6 text-xs text-white/25 tracking-wide uppercase">
          No credit card required &nbsp;·&nbsp; Free forever plan &nbsp;·&nbsp; GDPR compliant
        </p>

        {/* Hero visual */}
        <div className="animate-scale-in delay-500 relative mt-16 w-full max-w-3xl mx-auto">
          {/* Glow behind card */}
          <div
            className="absolute inset-0 animate-glow-pulse"
            style={{
              borderRadius: "20px",
              background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))",
              filter: "blur(30px)",
              transform: "scale(1.05)",
            }}
          />
          {/* Mock chat UI */}
          <div className="relative gradient-border rounded-2xl p-0.5 shadow-2xl">
            <div className="glass-dark rounded-2xl overflow-hidden">
              {/* Title bar */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
                </div>
                <div className="flex-1 flex items-center justify-center gap-2 text-xs text-white/30">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  contract_2024.pdf — AI Doc Chat
                </div>
              </div>
              {/* Chat messages */}
              <div className="p-6 space-y-4 text-left min-h-[180px]">
                <div className="flex gap-3 items-start animate-fade-up delay-700">
                  <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center" style={{background: "linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" stroke="white" strokeWidth="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="white" strokeWidth="2"/></svg>
                  </div>
                  <div className="glass rounded-xl rounded-tl-sm px-4 py-2.5 text-sm text-white/85 max-w-md">
                    What are the key termination clauses in this contract?
                  </div>
                </div>
                <div className="flex gap-3 items-start animate-fade-up delay-800">
                  <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center" style={{background: "linear-gradient(135deg,#1e1b4b,#312e81)"}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#818cf8"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="17" r="0.8" fill="white"/></svg>
                  </div>
                  <div className="rounded-xl rounded-tl-sm px-4 py-2.5 text-sm max-w-md" style={{background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))", border: "1px solid rgba(99,102,241,0.2)"}}>
                    <span className="text-white/90">Found <span className="text-indigo-300 font-semibold">3 termination clauses</span> on pages 4, 11, and 17. The primary clause states either party may terminate with <span className="text-purple-300 font-semibold">30 days written notice</span>...</span>
                  </div>
                </div>
              </div>
              {/* Input bar */}
              <div className="px-5 py-4 border-t border-white/5 flex items-center gap-3">
                <div className="flex-1 input-glass rounded-xl px-4 py-2.5 text-sm text-white/30">
                  Ask anything about your document...
                </div>
                <button className="btn-primary w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 2L15 22 11 13 2 9l20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="relative z-10 py-14 px-6 border-y border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className={`text-center animate-fade-up delay-${(i + 1) * 100}`}>
              <div className="stat-number text-3xl sm:text-4xl font-extrabold text-gradient mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-white/40 font-medium uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <div className="animate-fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-purple-500/20 text-xs text-purple-300 font-semibold uppercase tracking-widest mb-4">
              Features
            </div>
            <h2 className="animate-fade-up delay-100 text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4">
              Everything you need.{" "}
              <span className="text-gradient">Nothing you don&apos;t.</span>
            </h2>
            <p className="animate-fade-up delay-200 text-white/45 text-lg max-w-xl mx-auto">
              Built for professionals who need answers fast, without the noise.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className={`feature-card glass-card rounded-2xl p-6 cursor-default animate-fade-up delay-${(i + 1) * 100}`}
                style={{ borderColor: f.border }}
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: f.color, boxShadow: `0 0 20px ${f.glow}` }}
                >
                  {f.icon}
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="gradient-border rounded-3xl p-px">
            <div
              className="rounded-3xl px-10 py-16 text-center relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(10,10,40,0.9), rgba(20,8,50,0.9))" }}
            >
              {/* BG glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,102,241,0.12), transparent)",
                }}
              />
              <div className="animate-fade-up relative z-10">
                <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
                  Ready to work smarter?
                </h2>
                <p className="text-white/50 text-lg mb-8 max-w-lg mx-auto">
                  Join thousands of professionals who save hours every week with AI Doc Chat.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link
                    href="/signup"
                    className="btn-primary shimmer-btn relative overflow-hidden inline-flex items-center gap-2 px-10 py-4 rounded-xl text-white font-bold text-lg"
                  >
                    Start for free
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                  <Link
                    href="/login"
                    className="btn-secondary inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white/70 font-semibold text-base"
                  >
                    Sign in instead
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/25">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background: "linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 10h16M4 14h10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <span className="font-semibold text-white/40">AI Doc Chat</span>
          </div>
          <span>© {new Date().getFullYear()} AI Doc Chat. All rights reserved.</span>
          <div className="flex gap-5">
            <span className="hover:text-white/60 cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-white/60 cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-white/60 cursor-pointer transition-colors">Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
