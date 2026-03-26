"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const recentDocs = [
  { name: "Q4_2024_Contract.pdf", size: "2.4 MB", date: "2 hours ago", pages: 34, color: "#6366f1" },
  { name: "Employee_Handbook.docx", size: "1.1 MB", date: "Yesterday", pages: 88, color: "#8b5cf6" },
  { name: "Project_Proposal_v3.pdf", size: "4.7 MB", date: "3 days ago", pages: 22, color: "#06b6d4" },
  { name: "Research_Paper_AI.pdf", size: "3.2 MB", date: "1 week ago", pages: 56, color: "#ec4899" },
];

const quickActions = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="17,8 12,3 7,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Upload Document",
    desc: "Add a new file to your library",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.12)",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "New Chat",
    desc: "Start a conversation with AI",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Search Docs",
    desc: "Find anything across your files",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Summarize",
    desc: "Get instant document summaries",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.1)",
  },
];

const statsData = [
  { label: "Documents", value: "12", delta: "+3 this week", icon: "📄", color: "#6366f1" },
  { label: "Chats", value: "47", delta: "+12 today", icon: "💬", color: "#8b5cf6" },
  { label: "Queries", value: "234", delta: "+18% vs last week", icon: "⚡", color: "#06b6d4" },
  { label: "Saved", value: "1.2 GB", delta: "of 10 GB used", icon: "💾", color: "#ec4899" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("there");
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      router.replace("/login");
      return;
    }
    setMounted(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    router.replace("/login");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl animate-glow-pulse" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}/>
          <p className="text-white/30 text-sm animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="animate-orb-1 absolute" style={{top:"-20%",left:"-5%",width:"700px",height:"700px",borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)",filter:"blur(60px)"}}/>
        <div className="animate-orb-2 absolute" style={{top:"30%",right:"-10%",width:"500px",height:"500px",borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 70%)",filter:"blur(70px)"}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.025) 1px,transparent 1px)",backgroundSize:"80px 80px"}}/>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        {/* ── TOPBAR ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 animate-fade-up">
          <div>
            <p className="text-sm text-white/35 font-medium mb-0.5">{greeting}, {userName} 👋</p>
            <h1 className="text-3xl font-extrabold text-white">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden sm:block">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="input-glass pl-9 pr-4 py-2 rounded-xl text-sm w-56"
              />
            </div>
            {/* Notifications */}
            <button className="btn-secondary relative w-9 h-9 rounded-xl flex items-center justify-center text-white/60">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500"/>
            </button>
            {/* Avatar + logout */}
            <div className="relative group">
              <button className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white transition-all" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                {userName.charAt(0).toUpperCase()}
              </button>
              <div className="absolute right-0 top-full mt-2 w-40 glass-dark rounded-xl overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50" style={{border:"1px solid rgba(255,255,255,0.08)"}}>
                <button className="w-full text-left px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>
                  Profile
                </button>
                <button className="w-full text-left px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  Settings
                </button>
                <div className="border-t border-white/5 mx-2"/>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── STATS GRID ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsData.map((s, i) => (
            <div key={i} className={`glass-card rounded-2xl p-5 animate-fade-up delay-${(i+1)*100}`} style={{borderColor:`${s.color}22`}}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{background:`${s.color}18`,color:s.color}}>{s.delta}</span>
              </div>
              <div className="stat-number text-2xl font-extrabold text-white mb-0.5">{s.value}</div>
              <div className="text-xs text-white/35 font-medium uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN CONTENT GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Quick actions + Recent docs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick actions */}
            <div className="animate-fade-up delay-200">
              <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {quickActions.map((a, i) => (
                  <button
                    key={i}
                    className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center group transition-all duration-300 cursor-pointer"
                    style={{borderColor:`${a.color}22`}}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{background:a.bg,color:a.color}}>
                      {a.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">{a.title}</div>
                      <div className="text-xs text-white/30 mt-0.5 hidden sm:block">{a.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent documents */}
            <div className="animate-fade-up delay-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Recent Documents</h2>
                <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium flex items-center gap-1">
                  View all
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
              <div className="space-y-2.5">
                {recentDocs.map((doc, i) => (
                  <div
                    key={i}
                    className={`group flex items-center gap-4 glass-card rounded-xl px-4 py-3 cursor-pointer animate-fade-up delay-${(i+2)*100}`}
                  >
                    {/* File icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:`${doc.color}18`}}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={doc.color} strokeWidth="1.8" strokeLinejoin="round"/>
                        <polyline points="14,2 14,8 20,8" stroke={doc.color} strokeWidth="1.8" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white/85 truncate group-hover:text-white transition-colors">{doc.name}</p>
                      <p className="text-xs text-white/30">{doc.pages} pages · {doc.size} · {doc.date}</p>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all text-xs">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2"/></svg>
                      </button>
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Upload drop zone + chat preview */}
          <div className="space-y-6">
            {/* Upload area */}
            <div className="animate-fade-up delay-400">
              <h2 className="text-lg font-bold text-white mb-4">Upload</h2>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
                className="rounded-2xl p-8 text-center cursor-pointer transition-all duration-300"
                style={{
                  background: dragOver ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.02)",
                  border: `2px dashed ${dragOver ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${dragOver ? "animate-bounce-gentle" : ""}`}
                  style={{background:"rgba(99,102,241,0.12)"}}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="17,8 12,3 7,8" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="3" x2="12" y2="15" stroke="#818cf8" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white/70 mb-1">
                  {dragOver ? "Drop to upload!" : "Drop files here"}
                </p>
                <p className="text-xs text-white/30 mb-4">PDF, DOCX, TXT, XLSX — up to 100 MB</p>
                <button className="btn-primary px-5 py-2 rounded-xl text-sm font-semibold text-white">
                  Browse files
                </button>
              </div>
            </div>

            {/* AI Chat preview */}
            <div className="animate-fade-up delay-500">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">AI Assistant</h2>
                <span className="flex items-center gap-1.5 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
                  Online
                </span>
              </div>
              <div className="glass-card rounded-2xl p-4" style={{borderColor:"rgba(99,102,241,0.15)"}}>
                <div className="space-y-3 mb-4 min-h-[100px]">
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="white"/></svg>
                    </div>
                    <div className="glass rounded-xl rounded-tl-sm px-3 py-2 text-xs text-white/75 max-w-[80%]">
                      Hello! Upload a document and I&apos;ll help you extract insights instantly. ✨
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input placeholder="Ask about your docs..." className="input-glass flex-1 px-3 py-2 rounded-xl text-xs"/>
                  <button className="btn-primary w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 2L15 22 11 13 2 9l20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Usage */}
            <div className="animate-fade-up delay-600 glass-card rounded-2xl p-5" style={{borderColor:"rgba(99,102,241,0.12)"}}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white/70">Storage</span>
                <span className="text-xs text-white/35">1.2 / 10 GB</span>
              </div>
              <div className="w-full h-1.5 rounded-full mb-4" style={{background:"rgba(255,255,255,0.06)"}}>
                <div className="h-full rounded-full transition-all duration-500" style={{width:"12%",background:"linear-gradient(90deg,#6366f1,#8b5cf6)"}}/>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/70">API Queries</span>
                <span className="text-xs text-white/35">234 / 1000</span>
              </div>
              <div className="w-full h-1.5 rounded-full mt-3" style={{background:"rgba(255,255,255,0.06)"}}>
                <div className="h-full rounded-full transition-all duration-500" style={{width:"23%",background:"linear-gradient(90deg,#8b5cf6,#ec4899)"}}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
