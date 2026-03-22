// components/Navbar.tsx
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="w-full bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-gray-900 hover:text-primary transition-colors">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-primary"><rect width="24" height="24" rx="6" fill="#6366F1"/><path d="M7.5 12.5L12 8l4.5 4.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 16V8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>AI Doc Chat</span>
        </Link>
        <div className="flex gap-2 md:gap-4 items-center">
          <Link href="/login" className="px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 font-medium transition-colors">Login</Link>
          <Link href="/signup" className="px-4 py-2 rounded-md bg-primary text-white font-semibold shadow hover:bg-primary/90 transition-colors">Sign Up</Link>
          <Link href="/dashboard" className="px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 font-medium transition-colors hidden md:inline">Dashboard</Link>
        </div>
      </div>
    </nav>
  );
}