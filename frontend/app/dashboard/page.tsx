"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDocuments, uploadDocuments, deleteDocument, Document } from "@/services/documents";
import { sendChatMessage, getChatHistory, Message, ConversationRecord } from "@/services/chat";
import MarkdownMessage from "@/components/MarkdownMessage";

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
    action: "upload",
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
    action: "chat",
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
    action: "search",
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
    action: "summarize",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("there");
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Documents
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Chat
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! Upload a document and I'll help you extract insights instantly. ✨" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  // History
  const [chatTab, setChatTab] = useState<"chat" | "history">("chat");
  const [historyDocId, setHistoryDocId] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<ConversationRecord[]>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "loading" | "">("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async (token: string) => {
    setDocsLoading(true);
    try {
      const docs = await getDocuments(token);
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocId) setSelectedDocId(docs[0].id);
    } catch {
      // silently fail — user sees empty list
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) { router.replace("/login"); return; }
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUserName(JSON.parse(stored).name || "there"); } catch { /* ignore */ }
    }
    setMounted(true);
    fetchDocuments(token);
  }, [router]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const fetchHistory = async (docId: number) => {
    const token = localStorage.getItem("jwt");
    if (!token) return;
    setHistoryLoading(true);
    setHistoryRecords([]);
    try {
      const records = await getChatHistory(docId, token);
      setHistoryRecords(records);
    } catch {
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTabSwitch = (tab: "chat" | "history") => {
    setChatTab(tab);
    if (tab === "history") {
      // Auto-select first document if none chosen for history yet
      const firstId = historyDocId ?? documents[0]?.id ?? null;
      if (firstId) { setHistoryDocId(firstId); fetchHistory(firstId); }
    }
  };

  const handleHistoryDocSelect = (docId: number) => {
    setHistoryDocId(docId);
    fetchHistory(docId);
  };

  const handleDocChange = (id: number) => {
    setSelectedDocId(id);
  };

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");
    router.replace("/login");
  };

  const showToast = (msg: string, type: "success" | "error" | "loading") => {
    setToastMessage(msg);
    setToastType(type);
    if (type !== "loading") {
      setTimeout(() => { setToastMessage(""); setToastType(""); }, 3500);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const token = localStorage.getItem("jwt");
    if (!token) return;
    setUploading(true);
    setUploadError("");
    showToast(`Uploading ${files.length} file${files.length > 1 ? "s" : ""}…`, "loading");
    try {
      await uploadDocuments(Array.from(files), token);
      await fetchDocuments(token);
      showToast("Document uploaded successfully!", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setUploadError(msg);
      showToast(msg, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    const token = localStorage.getItem("jwt");
    if (!token) return;
    try {
      await deleteDocument(docId, token);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDocId === docId) setSelectedDocId(documents.find((d) => d.id !== docId)?.id ?? null);
    } catch { /* ignore */ }
  };

  const handleNewChat = () => {
    setChatMessages([
      { role: "assistant", content: "Hello! Upload a document and I\u2019ll help you extract insights instantly. ✨" },
    ]);
    setChatInput("");
    setChatError("");
    setChatTab("chat");
  };

  const handleSummarize = async () => {
    if (!selectedDocId) {
      showToast("Please select a document first to summarize.", "error");
      return;
    }
    const token = localStorage.getItem("jwt");
    if (!token) return;
    setChatTab("chat");
    const summaryQuestion = "Please provide a comprehensive summary of this document. Include: (1) The main topic and purpose, (2) Key points and findings, (3) Any important data or details, (4) Conclusions or recommendations.";
    setChatInput("");
    setChatError("");
    setChatMessages((prev) => [...prev, { role: "user", content: "📋 Summarize this document" }]);
    setChatLoading(true);
    try {
      const res = await sendChatMessage({
        documentId: selectedDocId,
        question: summaryQuestion,
        conversationHistory: [],
        token,
      });
      setChatMessages((prev) => [...prev, { role: "assistant", content: res.answer }]);
    } catch (e: unknown) {
      setChatError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendChat = async () => {
    const question = chatInput.trim();
    if (!question || !selectedDocId || chatLoading) return;
    const token = localStorage.getItem("jwt");
    if (!token) return;

    setChatInput("");
    setChatError("");
    const history = chatMessages.filter((m) => m.role !== "assistant" || chatMessages.indexOf(m) > 0);
    const userMsg: Message = { role: "user", content: question };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const res = await sendChatMessage({
        documentId: selectedDocId,
        question,
        conversationHistory: history.slice(-10), // keep last 10 turns
        token,
      });
      setChatMessages((prev) => [...prev, { role: "assistant", content: res.answer }]);
    } catch (e: unknown) {
      setChatError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setChatLoading(false);
    }
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
  const filteredDocs = searchQuery
    ? documents.filter(d => d.filename.toLowerCase().includes(searchQuery.toLowerCase()))
    : documents;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept=".pdf,.txt"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />

      {/* Toast notification */}
      {toastMessage && (
        <div
          className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl transition-all duration-300 animate-fade-up"
          style={{
            maxWidth: "360px",
            background: toastType === "success" ? "rgba(16,185,129,0.12)" : toastType === "error" ? "rgba(239,68,68,0.12)" : "rgba(12,12,30,0.92)",
            border: `1px solid ${toastType === "success" ? "rgba(16,185,129,0.45)" : toastType === "error" ? "rgba(239,68,68,0.45)" : "rgba(99,102,241,0.45)"}`,
            backdropFilter: "blur(24px)",
          }}
        >
          {toastType === "loading" && (
            <svg className="animate-spin flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="60" strokeDashoffset="20"/>
            </svg>
          )}
          {toastType === "success" && (
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{background:"rgba(16,185,129,0.2)"}}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><polyline points="20,6 9,17 4,12" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          )}
          {toastType === "error" && (
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{background:"rgba(239,68,68,0.2)"}}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
          )}
          <span className={`text-sm font-medium ${
            toastType === "success" ? "text-emerald-300" : toastType === "error" ? "text-red-300" : "text-white/90"
          }`}>{toastMessage}</span>
          {toastType !== "loading" && (
            <button onClick={() => setToastMessage("")} className="ml-auto text-white/30 hover:text-white/60 transition-colors flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
      )}

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
                ref={searchInputRef}
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
          {[
            { label: "Documents", value: String(documents.length), delta: "uploaded", icon: "📄", color: "#6366f1" },
            { label: "Chats", value: String(chatMessages.filter(m => m.role === "user").length), delta: "this session", icon: "💬", color: "#8b5cf6" },
            { label: "Queries", value: String(chatMessages.filter(m => m.role === "user").length), delta: "questions asked", icon: "⚡", color: "#06b6d4" },
            { label: "AI Ready", value: selectedDocId ? "Yes" : "No", delta: selectedDocId ? "doc selected" : "upload a doc", icon: "💾", color: "#ec4899" },
          ].map((s, i) => (
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
          {/* Left: Quick actions + Upload + Documents + Usage */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick actions */}
            <div className="animate-fade-up delay-200">
              <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (a.action === "upload") fileInputRef.current?.click();
                      else if (a.action === "chat") handleNewChat();
                      else if (a.action === "search") searchInputRef.current?.focus();
                      else if (a.action === "summarize") handleSummarize();
                    }}
                    className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center group transition-all duration-300 cursor-pointer"
                    style={{borderColor:`${a.color}22`}}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{background:a.bg,color:a.color}}>
                      {a.icon}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white/80 group-hover:text-white transition-colors">{a.title}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent documents */}
            <div className="animate-fade-up delay-300">
              <h2 className="text-lg font-bold text-white mb-4">Recent Documents</h2>
              {docsLoading && (
                <p className="text-xs text-white/30 py-4 text-center">Loading documents…</p>
              )}
              {!docsLoading && documents.length === 0 && (
                <p className="text-xs text-white/30 py-4 text-center">No documents yet. Upload a PDF or TXT to get started.</p>
              )}
              {!docsLoading && documents.length > 0 && filteredDocs.length === 0 && (
                <p className="text-xs text-white/30 py-4 text-center">No results for &quot;{searchQuery}&quot;</p>
              )}
              <div className="space-y-2.5">
                {filteredDocs.map((doc, i) => {
                  const colors = ["#6366f1","#8b5cf6","#06b6d4","#ec4899"];
                  const color = colors[i % colors.length];
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleDocChange(doc.id)}
                      className={`group flex items-center gap-4 glass-card rounded-xl px-4 py-3 cursor-pointer animate-fade-up transition-all duration-200`}
                      style={{
                        borderColor: selectedDocId === doc.id ? `${color}55` : undefined,
                        background: selectedDocId === doc.id ? `${color}12` : undefined,
                        boxShadow: selectedDocId === doc.id ? `inset 3px 0 0 ${color}` : undefined,
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:`${color}18`}}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
                          <polyline points="14,2 14,8 20,8" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate transition-colors ${selectedDocId === doc.id ? "text-white" : "text-white/85 group-hover:text-white"}`}>{doc.filename}</p>
                        <p className="text-xs text-white/30">{new Date(doc.created_at).toLocaleDateString()}</p>
                      </div>
                      {selectedDocId === doc.id && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{background:`${color}22`, color}}>
                          Active
                        </span>
                      )}
                      <div className={`flex items-center gap-1.5 transition-opacity ${selectedDocId === doc.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedDocId(doc.id); }}
                          title="Chat with this document"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2"/></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Expanded AI Chat (2 cols wide) */}
          <div className="lg:col-span-2 animate-fade-up delay-400">
            <div className="glass-card rounded-2xl flex flex-col" style={{borderColor:"rgba(99,102,241,0.15)", height:"680px"}}>

              {/* ── Panel Header ── */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight">AI Assistant</h2>
                    <span className="flex items-center gap-1.5 text-xs text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
                      Online
                    </span>
                  </div>
                </div>
                {/* Tab switcher */}
                <div className="flex gap-1 p-1 rounded-xl" style={{background:"rgba(255,255,255,0.05)"}}>
                  <button
                    onClick={() => setChatTab("chat")}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={chatTab === "chat" ? {background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"white"} : {color:"rgba(255,255,255,0.4)"}}
                  >
                    New Chat
                  </button>
                  <button
                    onClick={() => handleTabSwitch("history")}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={chatTab === "history" ? {background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"white"} : {color:"rgba(255,255,255,0.4)"}}
                  >
                    History
                  </button>
                </div>
              </div>

              {/* ── Document selector (chat tab only) ── */}
              {chatTab === "chat" && (
                <div className="px-5 pt-4 pb-2 flex-shrink-0">
                  {documents.length > 0 ? (
                    <select
                      value={selectedDocId ?? ""}
                      onChange={(e) => handleDocChange(Number(e.target.value))}
                      className="input-glass w-full px-3 py-2.5 rounded-xl text-sm"
                    >
                      {documents.map((d) => (
                        <option key={d.id} value={d.id}>{d.filename}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-white/30 text-center py-2">Upload a document to get started</p>
                  )}
                </div>
              )}

              {/* ── Chat Tab ── */}
              {chatTab === "chat" && (
                <>
                  <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4" style={{minHeight:0}}>
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex gap-3 items-start ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        {msg.role === "assistant" && (
                          <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="white"/></svg>
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-3 max-w-[82%] ${msg.role === "user" ? "rounded-tr-sm text-white/90 text-sm leading-relaxed" : "rounded-tl-sm text-white/80 min-w-0"}`}
                          style={msg.role === "user"
                            ? {background:"rgba(99,102,241,0.28)"}
                            : {background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)"}}
                        >
                          {msg.role === "assistant" ? (
                            <MarkdownMessage content={msg.content} role="assistant" />
                          ) : (
                            msg.content
                          )}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="white"/></svg>
                        </div>
                        <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm" style={{background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)"}}>
                          <span className="inline-flex gap-1 items-center">
                            <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{animationDelay:"0ms"}}/>
                            <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{animationDelay:"150ms"}}/>
                            <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{animationDelay:"300ms"}}/>
                          </span>
                        </div>
                      </div>
                    )}
                    {chatError && <p className="text-xs text-red-400 px-1">{chatError}</p>}
                    <div ref={chatEndRef}/>
                  </div>
                  {/* Input */}
                  <div className="px-5 pb-5 pt-3 flex-shrink-0 border-t border-white/5">
                    <div className="flex gap-3">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                        placeholder={selectedDocId ? "Ask anything about your document…" : "Select a document first…"}
                        disabled={!selectedDocId || chatLoading}
                        className="input-glass flex-1 px-4 py-3 rounded-xl text-sm disabled:opacity-40"
                      />
                      <button
                        onClick={handleSendChat}
                        disabled={!selectedDocId || chatLoading || !chatInput.trim()}
                        className="btn-primary w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M22 2L15 22 11 13 2 9l20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ── History Tab — two-pane document-wise layout ── */}
              {chatTab === "history" && (
                <div className="flex flex-1 overflow-hidden" style={{minHeight:0}}>

                  {/* Left: document list */}
                  <div className="w-48 flex-shrink-0 border-r border-white/5 overflow-y-auto py-3">
                    {documents.length === 0 && (
                      <p className="text-xs text-white/25 text-center px-3 pt-8">No documents</p>
                    )}
                    {documents.map((doc, i) => {
                      const colors = ["#6366f1","#8b5cf6","#06b6d4","#ec4899"];
                      const color = colors[i % colors.length];
                      const active = historyDocId === doc.id;
                      return (
                        <button
                          key={doc.id}
                          onClick={() => handleHistoryDocSelect(doc.id)}
                          className="w-full text-left px-3 py-2.5 mx-0 flex items-center gap-2.5 transition-all duration-150"
                          style={active
                            ? {background:"rgba(99,102,241,0.15)", borderRight:`2px solid ${color}`}
                            : {borderRight:"2px solid transparent"}}
                        >
                          <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center" style={{background:`${color}18`}}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
                              <polyline points="14,2 14,8 20,8" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <span className={`text-xs font-medium truncate ${active ? "text-white" : "text-white/50"}`}>{doc.filename}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right: conversations for selected doc */}
                  <div className="flex-1 overflow-y-auto px-4 py-4" style={{minHeight:0}}>
                    {!historyDocId && (
                      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:"rgba(99,102,241,0.1)"}}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/></svg>
                        </div>
                        <p className="text-sm text-white/30">Select a document to view history</p>
                      </div>
                    )}
                    {historyDocId && historyLoading && (
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/>
                        </svg>
                        <p className="text-sm text-white/30 animate-pulse">Loading history…</p>
                      </div>
                    )}
                    {historyDocId && !historyLoading && historyRecords.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:"rgba(99,102,241,0.1)"}}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/></svg>
                        </div>
                        <p className="text-sm text-white/30">No history for this document yet.</p>
                        <p className="text-xs text-white/20">Chat with it first in the &quot;New Chat&quot; tab.</p>
                      </div>
                    )}
                    {historyDocId && !historyLoading && historyRecords.length > 0 && (
                      <div className="space-y-4">
                        {/* Document label */}
                        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round"/><polyline points="14,2 14,8 20,8" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round"/></svg>
                          <span className="text-xs font-semibold text-indigo-400 truncate">{documents.find(d => d.id === historyDocId)?.filename}</span>
                          <span className="ml-auto text-xs text-white/25 flex-shrink-0">{historyRecords.length} Q&amp;A{historyRecords.length !== 1 ? "s" : ""}</span>
                        </div>
                        {historyRecords.map((record, i) => (
                          <div key={record.id} className="rounded-2xl p-4" style={{background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)"}}>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{background:"rgba(99,102,241,0.2)", color:"#818cf8"}}>
                                #{historyRecords.length - i}
                              </span>
                              <span className="text-xs text-white/25">{new Date(record.created_at).toLocaleString()}</span>
                            </div>
                            {/* Question */}
                            <div className="flex justify-end mb-2.5">
                              <div className="rounded-2xl rounded-tr-sm px-3 py-2 text-xs text-white/85 max-w-[90%] leading-relaxed" style={{background:"rgba(99,102,241,0.22)"}}>
                                {record.question}
                              </div>
                            </div>
                            {/* Answer */}
                            <div className="flex gap-2 items-start">
                              <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="white"/></svg>
                              </div>
                              <div className="rounded-2xl rounded-tl-sm px-3 py-2 flex-1 min-w-0" style={{background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)"}}>
                                <MarkdownMessage content={record.answer} role="assistant" compact />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
