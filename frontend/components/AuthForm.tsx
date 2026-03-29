// components/AuthForm.tsx
// Note: Login and Signup pages have their own premium inline UI.
// This component is kept as a lightweight fallback / reusable base.
import React from "react";
import Link from "next/link";

export type AuthFormProps = {
  type: "login" | "signup";
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
  error?: string;
};

export default function AuthForm({ type, onSubmit, isLoading, error }: AuthFormProps) {
  const isLogin = type === "login";
  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md gradient-border rounded-2xl p-px"
      autoComplete="off"
    >
      <div className="glass-dark rounded-2xl px-8 py-8 flex flex-col gap-5">
        <h2 className="text-2xl font-extrabold text-white text-center">
          {isLogin ? "Sign in" : "Create account"}
        </h2>
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)"}}>
            <span className="text-red-400">{error}</span>
          </div>
        )}
        <div className="flex flex-col gap-3.5">
          {!isLogin && (
            <input type="text" name="name" placeholder="Full Name" className="input-glass w-full px-4 py-3 rounded-xl text-sm" required />
          )}
          <input type="email" name="email" placeholder="Email address" className="input-glass w-full px-4 py-3 rounded-xl text-sm" required />
          <input type="password" name="password" placeholder="Password" className="input-glass w-full px-4 py-3 rounded-xl text-sm" required />
        </div>
        <button
          type="submit"
          className="btn-primary w-full py-3 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2"
          disabled={isLoading}
        >
          {isLogin ? (isLoading ? "Signing in..." : "Sign In") : isLoading ? "Creating account..." : "Sign Up"}
        </button>
        <div className="text-center text-white/40 text-sm">
          {isLogin ? (
            <>Don&apos;t have an account?{' '}<Link href="/signup" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">Sign up</Link></>
          ) : (
            <>Already have an account?{' '}<Link href="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">Sign in</Link></>
          )}
        </div>
      </div>
    </form>
  );
}

