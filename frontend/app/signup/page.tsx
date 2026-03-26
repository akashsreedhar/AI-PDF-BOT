"use client";
// app/signup/page.tsx

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signupUser } from "../../services/auth";

const perks = [
  { icon: "⚡", text: "Lightning-fast AI responses" },
  { icon: "🔒", text: "End-to-end encrypted documents" },
  { icon: "♾️", text: "Unlimited document uploads" },
  { icon: "🌍", text: "Access from anywhere" },
];

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // Password strength
  const getStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };
  const strength = getStrength(password);
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["", "#ef4444", "#f59e0b", "#22c55e", "#6366f1"];

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await signupUser({ name, email, password });
      if (result.token) {
        localStorage.setItem("jwt", result.token);
      }
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed. Please try again.");
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
      card.style.transform = `perspective(1000px) rotateY(${x * 3.5}deg) rotateX(${-y * 3.5}deg)`;
    };
    const handleLeave = () => {
      card.style.transition = "transform 0.6s cubic-bezier(0.16,1,0.3,1)";
      card.style.transform = "perspective(1000px) rotateY(0deg) rotateX(0deg)";
    };
    const handleEnter = () => { card.style.transition = "transform 0.12s ease"; };
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
        <div className="animate-orb-2 absolute" style={{top:"-10%",right:"-8%",width:"650px",height:"650px",borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.18) 0%,transparent 70%)",filter:"blur(50px)"}}/>
        <div className="animate-orb-1 absolute" style={{bottom:"-5%",left:"-10%",width:"550px",height:"550px",borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 70%)",filter:"blur(60px)"}}/>
        <div className="animate-orb-3 absolute" style={{top:"50%",left:"50%",width:"350px",height:"350px",borderRadius:"50%",background:"radial-gradient(circle,rgba(56,189,248,0.07) 0%,transparent 70%)",filter:"blur(70px)",transform:"translate(-50%,-50%)"}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(139,92,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.04) 1px,transparent 1px)",backgroundSize:"60px 60px",maskImage:"radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)"}}/>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back */}
        <Link href="/" className="animate-fade-up inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 mb-8 transition-colors group">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:-translate-x-1">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to home
        </Link>

        {/* Card */}
        <div ref={cardRef} className="animate-scale-in delay-100" style={{willChange:"transform",transition:"transform 0.6s cubic-bezier(0.16,1,0.3,1)"}}>
          <div className="gradient-border rounded-2xl p-px">
            <div className="glass-dark rounded-2xl px-8 pt-10 pb-8 relative overflow-hidden">
              {/* Top shimmer line */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px" style={{background:"linear-gradient(90deg,transparent,rgba(139,92,246,0.6),transparent)"}}/>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16" style={{background:"radial-gradient(ellipse,rgba(139,92,246,0.15),transparent 70%)",filter:"blur(8px)"}}/>

              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 animate-glow-pulse" style={{background:"linear-gradient(135deg,#8b5cf6,#6366f1)"}}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2.2"/>
                    <line x1="19" y1="8" x2="19" y2="14" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                    <line x1="22" y1="11" x2="16" y2="11" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h1 className="text-2xl font-extrabold text-white mb-1 animate-fade-up delay-200">Create your account</h1>
                <p className="text-sm text-white/40 animate-fade-up delay-300">Join thousands of professionals using AI Doc Chat</p>
              </div>

              {/* Perks row */}
              <div className="animate-fade-up delay-300 grid grid-cols-2 gap-2 mb-6">
                {perks.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
                    <span className="text-base">{p.icon}</span>
                    <span className="text-xs text-white/45 font-medium leading-tight">{p.text}</span>
                  </div>
                ))}
              </div>

              {/* Success */}
              {success && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl z-20" style={{background:"rgba(5,5,30,0.97)"}}>
                  <div className="text-center animate-scale-in">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-glow-pulse" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p className="text-white font-bold text-lg">Account created!</p>
                    <p className="text-white/40 text-sm mt-1">Taking you to your dashboard...</p>
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
              <form onSubmit={handleSignup} className="space-y-4" autoComplete="off">
                {/* Name */}
                <div className="animate-fade-up delay-400">
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Full Name</label>
                  <div className="relative">
                    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${focused==="name"?"text-purple-400":"text-white/25"}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
                      </svg>
                    </div>
                    <input
                      type="text" name="name" value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
                      placeholder="Jack Smith"
                      className="input-glass w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="animate-fade-up delay-500">
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Email address</label>
                  <div className="relative">
                    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${focused==="email"?"text-purple-400":"text-white/25"}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8"/>
                        <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.8"/>
                      </svg>
                    </div>
                    <input
                      type="email" name="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
                      placeholder="you@example.com"
                      className="input-glass w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="animate-fade-up delay-600">
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Password</label>
                  <div className="relative">
                    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${focused==="password"?"text-purple-400":"text-white/25"}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                      placeholder="Min. 8 characters"
                      className="input-glass w-full pl-10 pr-11 py-3 rounded-xl text-sm font-medium"
                      required minLength={8}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
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
                  {/* Strength meter */}
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4].map((s) => (
                          <div key={s} className="flex-1 h-1 rounded-full transition-all duration-300" style={{background: strength >= s ? strengthColors[strength] : "rgba(255,255,255,0.08)"}}/>
                        ))}
                      </div>
                      <p className="text-xs font-medium transition-colors" style={{color: strengthColors[strength] || "transparent"}}>
                        {strengthLabels[strength]}
                      </p>
                    </div>
                  )}
                </div>

                {/* Terms */}
                <div className="animate-fade-up delay-700 flex items-start gap-2.5 py-1">
                  <input type="checkbox" id="terms" required className="mt-0.5 w-4 h-4 rounded accent-indigo-500 flex-shrink-0 cursor-pointer"/>
                  <label htmlFor="terms" className="text-xs text-white/40 cursor-pointer leading-relaxed">
                    I agree to the{" "}
                    <span className="text-indigo-400 hover:text-indigo-300 transition-colors">Terms of Service</span>
                    {" "}and{" "}
                    <span className="text-indigo-400 hover:text-indigo-300 transition-colors">Privacy Policy</span>
                  </label>
                </div>

                {/* Submit */}
                <div className="animate-fade-up delay-700 pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary shimmer-btn w-full relative overflow-hidden py-3.5 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2.5"
                  >
                    {isLoading ? (
                      <>
                        <div className="spinner" style={{width:"18px",height:"18px"}}></div>
                        Creating account...
                      </>
                    ) : (
                      <>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                          <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2"/>
                          <line x1="19" y1="8" x2="19" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="22" y1="11" x2="16" y2="11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Create free account
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Sign in link */}
              <p className="animate-fade-up delay-800 text-center text-sm text-white/35 mt-6">
                Already have an account?{" "}
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="animate-fade-up delay-900 text-center text-xs text-white/20 mt-6">
          Free forever · No credit card needed · Cancel anytime
        </p>
      </div>
    </div>
  );
}
