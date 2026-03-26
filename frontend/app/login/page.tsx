"use client";
// app/login/page.tsx

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser } from "../../services/auth";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await loginUser({ email, password });
      if (result.token) {
        localStorage.setItem("jwt", result.token);
      }
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // Parallax tilt on card
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const handleMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(1000px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`;
    };
    const handleLeave = () => {
      card.style.transform = "perspective(1000px) rotateY(0deg) rotateX(0deg)";
      card.style.transition = "transform 0.6s cubic-bezier(0.16,1,0.3,1)";
    };
    const handleEnter = () => {
      card.style.transition = "transform 0.1s ease";
    };
    card.addEventListener("mousemove", handleMove);
    card.addEventListener("mouseleave", handleLeave);
    card.addEventListener("mouseenter", handleEnter);
    return () => {
      card.removeEventListener("mousemove", handleMove);
      card.removeEventListener("mouseleave", handleLeave);
      card.removeEventListener("mouseenter", handleEnter);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16 overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="animate-orb-1 absolute" style={{top:"-15%",left:"-10%",width:"600px",height:"600px",borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%)",filter:"blur(50px)"}}/>
        <div className="animate-orb-2 absolute" style={{bottom:"-10%",right:"-10%",width:"500px",height:"500px",borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.18) 0%,transparent 70%)",filter:"blur(60px)"}}/>
        <div className="animate-orb-3 absolute" style={{top:"40%",left:"40%",width:"400px",height:"400px",borderRadius:"50%",background:"radial-gradient(circle,rgba(236,72,153,0.08) 0%,transparent 70%)",filter:"blur(70px)"}}/>
        {/* Grid */}
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)",backgroundSize:"60px 60px",maskImage:"radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)"}}/>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back to home */}
        <Link
          href="/"
          className="animate-fade-up inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 mb-8 transition-colors group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:-translate-x-1">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to home
        </Link>

        {/* Card */}
        <div
          ref={cardRef}
          className="animate-scale-in delay-100"
          style={{ willChange: "transform", transition: "transform 0.6s cubic-bezier(0.16,1,0.3,1)" }}
        >
          <div className="gradient-border rounded-2xl p-px">
            <div className="glass-dark rounded-2xl px-8 pt-10 pb-8 relative overflow-hidden">
              {/* Top glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px" style={{background:"linear-gradient(90deg,transparent,rgba(99,102,241,0.6),transparent)"}}/>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16" style={{background:"radial-gradient(ellipse,rgba(99,102,241,0.15),transparent 70%)",filter:"blur(8px)"}}/>

              {/* Logo + Title */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 animate-glow-pulse" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M4 6h16M4 10h16M4 14h10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                    <circle cx="19" cy="17" r="3" fill="white" fillOpacity="0.9"/>
                  </svg>
                </div>
                <h1 className="text-2xl font-extrabold text-white mb-1 animate-fade-up delay-200">Welcome back</h1>
                <p className="text-sm text-white/40 animate-fade-up delay-300">Sign in to your AI Doc Chat account</p>
              </div>

              {/* Success state */}
              {success && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl z-20" style={{background:"rgba(5,5,30,0.95)"}}>
                  <div className="text-center animate-scale-in">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-glow-pulse" style={{background:"linear-gradient(135deg,#22c55e,#16a34a)"}}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p className="text-white font-bold text-lg">Signed in!</p>
                    <p className="text-white/40 text-sm mt-1">Redirecting to dashboard...</p>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl text-sm animate-fade-up" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)"}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                    <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                    <line x1="12" y1="8" x2="12" y2="12" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="16" r="0.8" fill="#ef4444"/>
                  </svg>
                  <span className="text-red-400">{error}</span>
                </div>
              )}

              {/* Form */}
              <form ref={formRef} onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                {/* Email */}
                <div className="animate-fade-up delay-300">
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focused === "email" ? "text-indigo-400" : "text-white/25"}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8"/>
                        <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.8"/>
                      </svg>
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      placeholder="you@example.com"
                      className="input-glass w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="animate-fade-up delay-400">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest">
                      Password
                    </label>
                    <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focused === "password" ? "text-indigo-400" : "text-white/25"}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      placeholder="••••••••••"
                      className="input-glass w-full pl-10 pr-11 py-3 rounded-xl text-sm font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/>
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <div className="animate-fade-up delay-500 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary shimmer-btn w-full relative overflow-hidden py-3.5 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2.5"
                  >
                    {isLoading ? (
                      <>
                        <div className="spinner" style={{width:"18px",height:"18px"}}></div>
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="10,17 15,12 10,7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="15" y1="12" x2="3" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div className="animate-fade-up delay-600 flex items-center gap-4 my-6">
                <div className="flex-1 h-px" style={{background:"rgba(255,255,255,0.07)"}}/>
                <span className="text-xs text-white/25 font-medium">or continue with</span>
                <div className="flex-1 h-px" style={{background:"rgba(255,255,255,0.07)"}}/>
              </div>

              {/* OAuth buttons */}
              <div className="animate-fade-up delay-700 grid grid-cols-2 gap-3">
                <button className="btn-secondary flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-sm font-medium text-white/70 transition-all">
                  <svg width="17" height="17" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
                <button className="btn-secondary flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-sm font-medium text-white/70 transition-all">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </button>
              </div>

              {/* Sign up link */}
              <p className="animate-fade-up delay-800 text-center text-sm text-white/35 mt-7">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  Create one free
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <p className="animate-fade-up delay-900 text-center text-xs text-white/20 mt-6">
          Protected by 256-bit AES encryption &nbsp;·&nbsp; SOC 2 Type II compliant
        </p>
      </div>
    </div>
  );
}
