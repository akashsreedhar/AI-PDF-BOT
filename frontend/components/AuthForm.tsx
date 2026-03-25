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
      className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-6 border border-gray-200"
      autoComplete="off"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        {isLogin ? "Sign in to your account" : "Create your account"}
      </h2>
      {error && <div className="text-red-600 text-sm text-center bg-red-50 rounded-lg py-2 px-3">{error}</div>}
      <div className="flex flex-col gap-4">
        {!isLogin && (
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            className="w-full rounded-lg px-4 py-3 border border-gray-300 bg-white text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
            required
          />
        )}
        <input
          type="email"
          name="email"
          placeholder="Email address"
          className="w-full rounded-lg px-4 py-3 border border-gray-300 bg-white text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          className="w-full rounded-lg px-4 py-3 border border-gray-300 bg-white text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold text-lg shadow hover:bg-indigo-700 transition-colors disabled:opacity-60 cursor-pointer"
        disabled={isLoading}
      >
        {isLogin ? (isLoading ? "Signing in..." : "Sign In") : isLoading ? "Signing up..." : "Sign Up"}
      </button>
      <div className="text-center text-gray-500 text-sm mt-2">
        {isLogin ? (
          <>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-indigo-600 font-medium hover:underline">Sign up</Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
          </>
        )}
      </div>
    </form>
  );
}
