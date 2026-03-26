"use client";
// components/Navbar.tsx
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (path: string) => pathname === path;
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const checkAuth = () => setIsLoggedIn(!!localStorage.getItem('jwt'));
    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    setIsLoggedIn(false);
    router.push('/');
  };

  // Hide navbar on login/signup pages
  const hideNav = pathname === '/login' || pathname === '/signup';
  if (hideNav) return null;

  return (
    <nav
      className="w-full sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(2, 2, 18, 0.92)' : 'rgba(2, 2, 18, 0.6)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderBottom: scrolled ? '1px solid rgba(99, 102, 241, 0.15)' : '1px solid rgba(255,255,255,0.04)',
        boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3.5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 18px rgba(99,102,241,0.28)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 10h16M4 14h10" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="19" cy="17" r="3" fill="#fff" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white/90 group-hover:text-white transition-colors tracking-tight">
            AI Doc Chat
          </span>
        </Link>

        {/* Nav links - desktop */}
        <div className="hidden md:flex items-center gap-0.5">
          {[
            { href: '/', label: 'Home' },
            ...(isLoggedIn ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive(item.href)
                  ? 'text-white'
                  : 'text-white/45 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {item.label}
              {isActive(item.href) && (
                <span
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                />
              )}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/dashboard') ? 'text-indigo-300 bg-indigo-500/10' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                  <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="btn-secondary px-3.5 py-2 rounded-lg text-sm font-medium text-white/60 flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/login') ? 'text-indigo-300' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="btn-primary shimmer-btn relative overflow-hidden px-4 py-2 rounded-lg text-sm font-semibold text-white"
              >
                Get started
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden ml-1 w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 px-6 py-4 space-y-1 animate-fade-up-sm">
          <Link href="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">Home</Link>
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">Dashboard</Link>
              <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/5 transition-colors">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">Sign in</Link>
              <Link href="/signup" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">Get started free</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}