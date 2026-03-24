import Navbar from "../components/Navbar";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-indigo-100 flex flex-col">
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24">
        <div className="max-w-2xl w-full text-center flex flex-col items-center gap-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-2">
            Welcome to <span className="text-indigo-600">AI Doc Chat</span>
          </h1>
          <p className="text-lg text-gray-700 mb-6">
            Your intelligent assistant for document Q&amp;A, search, and more. Sign up or log in to get started!
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login" className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold text-lg shadow hover:bg-indigo-700 transition-colors">
              Login
            </Link>
            <Link href="/signup" className="px-6 py-3 rounded-lg border border-indigo-600 text-indigo-600 font-semibold text-lg hover:bg-indigo-50 transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
