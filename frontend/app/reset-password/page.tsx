"use client";
// app/reset-password/page.tsx

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "../../services/auth";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    const handleEnter = () => { card.style.transition = "transform 0.1s ease"; };
    card.addEventListener("mousemove", handleMove);
    card.addEventListener("mouseleave", handleLeave);
    card.addEventListener("mouseenter", handleEnter);
    return () => {
      card.removeEventListener("mousemove", handleMove);
      card.removeEventListener("mouseleave", handleLeave);
      card.removeEventListener("mouseenter", handleEnter);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword({ token, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16 overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="animate-orb-1 absolute" style={{top:"-15%",left:"-10%",width:"600px",height:"600px",borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%)",filter:"blur(50px)"}}/>
        <div className="animate-orb-2 absolute" style={{bottom:"-10%",right:"-10%",width:"500px",height:"500px",borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.18) 0%,transparent 70%)",filter:"blur(60px)"}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)",backgroundSize:"60px 60px",maskImage:"radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)"}}/>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back to login */}
        <Link
          href="/login"
          className="animate-fade-up inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 mb-8 transition-colors group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:-translate-x-1">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to sign in
        </Link>

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
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="white" strokeWidth="2.2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h1 className="text-2xl font-extrabold text-white mb-1 animate-fade-up delay-200">Set new password</h1>
                <p className="text-sm text-white/40 animate-fade-up delay-300">Enter a new password for your account</p>
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
                    <p className="text-white font-bold text-lg">Password updated!</p>
                    <p className="text-white/40 text-sm mt-1">Redirecting to sign in...</p>
                  </div>
                </div>
              )}

              {/* No token warning */}
              {!token && !success && (
                <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)"}}>
                  <span className="text-red-400">Invalid or missing reset link. Please request a new one.</span>
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

              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                {/* New password */}
                <div className="animate-fade-up delay-300">
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">New password</label>
                  <div className="relative">
                    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focused === "new" ? "text-indigo-400" : "text-white/25"}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onFocus={() => setFocused("new")}
                      onBlur={() => setFocused(null)}
                      placeholder="••••••••••"
                      className="input-glass w-full pl-10 pr-11 py-3 rounded-xl text-sm font-medium"
                      required
                      disabled={!token}
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showNew ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="animate-fade-up delay-400">
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Confirm password</label>
                  <div className="relative">
                    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focused === "confirm" ? "text-indigo-400" : "text-white/25"}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocused("confirm")}
                      onBlur={() => setFocused(null)}
                      placeholder="••••••••••"
                      className="input-glass w-full pl-10 pr-11 py-3 rounded-xl text-sm font-medium"
                      required
                      disabled={!token}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showConfirm ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <div className="animate-fade-up delay-500 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || !token}
                    className="btn-primary shimmer-btn w-full relative overflow-hidden py-3.5 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2.5"
                  >
                    {isLoading ? (
                      <><div className="spinner" style={{width:"18px",height:"18px"}}></div>Updating...</>
                    ) : "Update password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <p className="animate-fade-up delay-900 text-center text-xs text-white/20 mt-6">
          Protected by 256-bit AES encryption &nbsp;·&nbsp; SOC 2 Type II compliant
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
