// components/AuthForm.tsx
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
      className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-8 flex flex-col gap-6 border border-gray-100 backdrop-blur"
      autoComplete="off"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        {isLogin ? "Sign in to your account" : "Create your account"}
      </h2>
      {error && <div className="text-red-600 text-sm text-center">{error}</div>}
      <div className="flex flex-col gap-4">
        {!isLogin && (
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            className="input input-bordered w-full rounded-lg px-4 py-3 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            required
          />
        )}
        <input
          type="email"
          name="email"
          placeholder="Email address"
          className="input input-bordered w-full rounded-lg px-4 py-3 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          className="input input-bordered w-full rounded-lg px-4 py-3 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full py-3 rounded-lg bg-primary text-white font-semibold text-lg shadow hover:bg-primary/90 transition-colors disabled:opacity-60"
        disabled={isLoading}
      >
        {isLogin ? (isLoading ? "Signing in..." : "Sign In") : isLoading ? "Signing up..." : "Sign Up"}
      </button>
      <div className="text-center text-gray-500 text-sm mt-2">
        {isLogin ? (
          <>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary font-medium hover:underline">Sign up</Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </>
        )}
      </div>
    </form>
  );
}
