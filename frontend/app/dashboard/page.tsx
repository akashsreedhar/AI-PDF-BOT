"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDocuments, uploadDocuments, deleteDocument, Document } from "@/services/documents";
import { sendChatMessage, getChatHistory, generateQuiz, streamChatMessage, Message, ConversationRecord, QuizQuestion } from "@/services/chat";
import MarkdownMessage from "@/components/MarkdownMessage";
import AgentThinking from "@/components/AgentThinking";

const LANGUAGES = ["English","Hindi","Telugu","Tamil","Malayalam","Spanish","French","German","Arabic","Chinese","Japanese"];

const quickActions = [
  {
    icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17,8 12,3 7,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>),
    title: "Upload Document", color: "#6366f1", bg: "rgba(99,102,241,0.12)", action: "upload",
  },
  {
    icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    title: "New Chat", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", action: "chat",
  },
  {
    icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    title: "Quiz Me", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", action: "quiz",
  },
  {
    icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>),
    title: "Summarize", color: "#ec4899", bg: "rgba(236,72,153,0.1)", action: "summarize",
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
  const [summaryDocId, setSummaryDocId] = useState<number | null>(null); // doc whose summary card is open

  // Chat
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! Upload a document and I'll help you extract insights instantly. ✨" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);

  // Chat modes
  const [liveMode, setLiveMode] = useState(false);
  const [liveSources, setLiveSources] = useState<string[]>([]);
  const [language, setLanguage] = useState("English");
  const [compareDocId, setCompareDocId] = useState<number | null>(null);

  // History
  const [chatTab, setChatTab] = useState<"chat" | "history" | "quiz">("chat");
  const [historyDocId, setHistoryDocId] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<ConversationRecord[]>([]);

  // Quiz
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "loading" | "">("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const chatEndRefMobile = useRef<HTMLDivElement>(null);
  const [mobileTab, setMobileTab] = useState<"home" | "docs" | "chat">("home");
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDocuments = async (token: string) => {
    setDocsLoading(true);
    try {
      const docs = await getDocuments(token);
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocId) setSelectedDocId(docs[0].id);
    } catch {
      // silently fail
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) { router.replace("/login"); return; }

    // Decode JWT payload to get the expiry time (no extra library needed)
    try {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.exp) {
        const msUntilExpiry = payload.exp * 1000 - Date.now();
        if (msUntilExpiry <= 0) {
          // Token already expired — clear storage and redirect immediately
          localStorage.removeItem("jwt");
          localStorage.removeItem("user");
          router.replace("/login");
          return;
        }
        // Schedule automatic logout exactly when the token expires
        expiryTimerRef.current = setTimeout(() => {
          localStorage.removeItem("jwt");
          localStorage.removeItem("user");
          router.replace("/login");
        }, msUntilExpiry);
      }
    } catch { /* malformed token — let the server reject it */ }

    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUserName(JSON.parse(stored).name || "there"); } catch { /* ignore */ }
    }
    setMounted(true);
    fetchDocuments(token);

    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, [router]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    chatEndRefMobile.current?.scrollIntoView({ behavior: "smooth" });
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
      { role: "assistant", content: "Hello! Upload a document and I\u2019ll help you extract insights instantly. \u2728" },
    ]);
    setChatInput("");
    setChatError("");
    setFollowUps([]);
    setLiveSources([]);
    setChatTab("chat");
  };

  const handleSummarize = async () => {
    if (!selectedDocId) { showToast("Please select a document first.", "error"); return; }
    const token = localStorage.getItem("jwt");
    if (!token) return;
    setChatTab("chat");
    setChatInput("");
    setChatError("");
    setFollowUps([]);
    setChatMessages((prev) => [...prev, { role: "user", content: "\uD83D\uDCCB Summarize this document" }]);
    setChatLoading(true);
    try {
      const res = await sendChatMessage({
        documentId: selectedDocId,
        question: "Provide a comprehensive summary: (1) main topic & purpose, (2) key points & findings, (3) important data, (4) conclusions.",
        conversationHistory: [],
        token,
        language,
      });
      setChatMessages((prev) => [...prev, { role: "assistant", content: res.answer }]);
      setFollowUps(res.follow_up_questions || []);
    } catch (e: unknown) {
      setChatError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendChat = async (overrideQuestion?: string) => {
    const question = (overrideQuestion ?? chatInput).trim();
    if (!question || !selectedDocId || chatLoading) return;
    const token = localStorage.getItem("jwt");
    if (!token) return;

    if (!overrideQuestion) setChatInput("");
    setChatError("");
    setLiveSources([]);
    setFollowUps([]);
    const history = chatMessages.filter((m) => m.role !== "assistant" || chatMessages.indexOf(m) > 0);

    // Add user message + empty assistant placeholder atomically
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);
    setChatLoading(true);

    try {
      await streamChatMessage({
        documentId: selectedDocId,
        question,
        conversationHistory: history.slice(-10),
        token,
        liveMode,
        language,
        compareDocumentId: compareDocId ?? undefined,
        onToken: (tok) => {
          setChatMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: last.content + tok };
            return updated;
          });
        },
        onDone: (data) => {
          if (data.live_sources?.length) setLiveSources(data.live_sources);
          setFollowUps(data.follow_up_questions || []);
        },
        onError: (err) => {
          setChatError(err);
          setChatMessages((prev) => prev.slice(0, -1)); // remove empty placeholder
        },
      });
    } catch (e: unknown) {
      setChatError(e instanceof Error ? e.message : "Something went wrong");
      setChatMessages((prev) => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!selectedDocId) { showToast("Please select a document first.", "error"); return; }
    const token = localStorage.getItem("jwt");
    if (!token) return;
    setChatTab("quiz");
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizLoading(true);
    try {
      const qs = await generateQuiz(selectedDocId, token, 5, language);
      setQuizQuestions(qs);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to generate quiz", "error");
      setChatTab("chat");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleExportChat = () => {
    const lines: string[] = [`# Chat Export\n`];
    chatMessages.forEach((m) => {
      lines.push(`**${m.role === "user" ? "You" : "AI"}:** ${m.content}\n`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Chat exported!", "success");
  };

  const handleTabSwitch = (tab: "chat" | "history" | "quiz") => {
    setChatTab(tab);
    if (tab === "history") {
      const firstId = historyDocId ?? documents[0]?.id ?? null;
      if (firstId) { setHistoryDocId(firstId); fetchHistory(firstId); }
    }
    if (tab === "quiz") handleStartQuiz();
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

  const mobileChatTabs = (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 p-1 rounded-xl flex-1" style={{background:"rgba(255,255,255,0.05)"}}>
        <button onClick={() => setChatTab("chat")} className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all" style={chatTab==="chat"?{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"white"}:{color:"rgba(255,255,255,0.4)"}}>Chat</button>
        <button onClick={() => handleTabSwitch("history")} className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all" style={chatTab==="history"?{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"white"}:{color:"rgba(255,255,255,0.4)"}}>History</button>
        <button onClick={() => handleTabSwitch("quiz")} className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all" style={chatTab==="quiz"?{background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"white"}:{color:"rgba(255,255,255,0.4)"}}>Quiz</button>
      </div>
      {chatTab==="chat" && (
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input-glass px-2 py-1.5 rounded-xl text-xs w-24 flex-shrink-0">
          {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      )}
    </div>
  );

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
          className="fixed bottom-20 left-4 right-4 lg:bottom-auto lg:top-6 lg:left-auto lg:right-6 z-[100] flex items-center gap-3 px-4 py-3 lg:px-5 lg:py-3.5 rounded-2xl shadow-2xl transition-all duration-300 animate-fade-up"
          style={{
            maxWidth: "360px",
            margin: "0 auto",
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

      {/* ── DESKTOP LAYOUT ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 hidden lg:block">
        {/* Desktop topbar */}
        <div className="flex items-center justify-between gap-4 mb-10 animate-fade-up">
          <div>
            <p className="text-sm text-white/35 font-medium mb-0.5">{greeting}, {userName} 👋</p>
            <h1 className="text-3xl font-extrabold text-white">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round"/></svg>
              </div>
              <input ref={searchInputRef} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search documents..." className="input-glass pl-9 pr-4 py-2 rounded-xl text-sm w-56"/>
            </div>
            <div className="relative group">
              <button className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                {userName.charAt(0).toUpperCase()}
              </button>
              <div className="absolute right-0 top-full mt-2 w-40 glass-dark rounded-xl overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50" style={{border:"1px solid rgba(255,255,255,0.08)"}}>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
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
                      else if (a.action === "quiz") handleStartQuiz();
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
                  const showSummary = summaryDocId === doc.id;
                  return (
                    <div key={doc.id} className="animate-fade-up">
                      <div
                        onClick={() => handleDocChange(doc.id)}
                        className={`group flex items-center gap-4 glass-card rounded-xl px-4 py-3 cursor-pointer transition-all duration-200`}
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
                          <p className={`text-sm font-semibold truncate transition-colors ${selectedDocId === doc.id ? "text-white" : "text-white/85 group-hover:text-white"}`}>
                            {doc.doc_title || doc.filename}
                          </p>
                          <p className="text-xs text-white/30">{new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                        {selectedDocId === doc.id && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{background:`${color}22`, color}}>
                            Active
                          </span>
                        )}
                        <div className={`flex items-center gap-1.5 transition-opacity ${selectedDocId === doc.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                          {doc.summary && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSummaryDocId(showSummary ? null : doc.id); }}
                              title="View summary"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedDocId(doc.id); }}
                            title="Chat with this document"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2"/></svg>
                          </button>
                        </div>
                      </div>
                      {/* Summary card */}
                      {showSummary && doc.summary && (
                        <div className="mx-1 mt-1 mb-1 px-4 py-3 rounded-xl text-xs" style={{background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.2)"}}>
                          {doc.doc_title && <p className="font-bold text-amber-300 mb-1.5">{doc.doc_title}</p>}
                          <p className="text-white/60 leading-relaxed mb-2">{doc.summary}</p>
                          {doc.key_topics && doc.key_topics.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {doc.key_topics.map((t, ti) => (
                                <span key={ti} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{background:"rgba(245,158,11,0.15)", color:"#fbbf24"}}>{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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
              <div className="flex flex-col gap-3 px-5 pt-5 pb-4 border-b border-white/5 flex-shrink-0">
                <div className="flex items-center justify-between">
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
                  <div className="flex items-center gap-2">
                    {/* Export */}
                    <button
                      onClick={handleExportChat}
                      title="Export chat as Markdown"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
                      style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.45)"}}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      Export
                    </button>
                    {/* Live mode toggle */}
                    <button
                      onClick={() => { setLiveMode((v) => !v); setLiveSources([]); }}
                      title={liveMode ? "Live Web Mode ON — click to disable" : "Enable Live Web Mode"}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
                      style={liveMode
                        ? {background:"rgba(6,182,212,0.18)", border:"1px solid rgba(6,182,212,0.45)", color:"#06b6d4"}
                        : {background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.35)"}}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Live
                    </button>
                    {/* Tab switcher */}
                    <div className="flex gap-1 p-1 rounded-xl" style={{background:"rgba(255,255,255,0.05)"}}>
                      <button
                        onClick={() => setChatTab("chat")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                        style={chatTab === "chat" ? {background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"white"} : {color:"rgba(255,255,255,0.4)"}}
                      >
                        Chat
                      </button>
                      <button
                        onClick={() => handleTabSwitch("history")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                        style={chatTab === "history" ? {background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"white"} : {color:"rgba(255,255,255,0.4)"}}
                      >
                        History
                      </button>
                      <button
                        onClick={() => handleTabSwitch("quiz")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                        style={chatTab === "quiz" ? {background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"white"} : {color:"rgba(255,255,255,0.4)"}}
                      >
                        Quiz
                      </button>
                    </div>
                  </div>
                </div>
                {/* Language + Compare row (chat tab only) */}
                {chatTab === "chat" && (
                  <div className="flex items-center gap-2">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="input-glass px-3 py-1.5 rounded-xl text-xs flex-1"
                      title="Response language"
                    >
                      {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                    {documents.length > 1 && (
                      <select
                        value={compareDocId ?? ""}
                        onChange={(e) => setCompareDocId(e.target.value ? Number(e.target.value) : null)}
                        className="input-glass px-3 py-1.5 rounded-xl text-xs flex-1"
                        title="Compare with another document"
                      >
                        <option value="">Compare with… (optional)</option>
                        {documents.filter(d => d.id !== selectedDocId).map((d) => (
                          <option key={d.id} value={d.id}>{d.filename}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
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
                        {/* Agent thinking / producing animation replaces the whole row for loading state */}
                        {msg.role === "assistant" && chatLoading && i === chatMessages.length - 1 ? (
                          <AgentThinking phase={msg.content === "" ? "thinking" : "producing"} />
                        ) : msg.role === "assistant" ? (
                          <>
                            <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="white"/></svg>
                            </div>
                            <div className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-[82%] text-white/80 min-w-0" style={{background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)"}}>
                              <MarkdownMessage content={msg.content} role="assistant" />
                            </div>
                          </>
                        ) : (
                          <div className="rounded-2xl rounded-tr-sm px-4 py-3 max-w-[82%] text-white/90 text-sm leading-relaxed" style={{background:"rgba(99,102,241,0.28)"}}>
                            {msg.content}
                          </div>
                        )}
                      </div>
                    ))}
                    {chatError && <p className="text-xs text-red-400 px-1">{chatError}</p>}
                    <div ref={chatEndRef}/>
                  </div>
                  {/* Follow-up question chips */}
                  {followUps.length > 0 && !chatLoading && (
                    <div className="mx-5 mb-2 flex flex-wrap gap-2 flex-shrink-0">
                      {followUps.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendChat(q)}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                          style={{background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.3)", color:"rgba(165,180,252,0.9)"}}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Live sources */}
                  {liveSources.length > 0 && (
                    <div className="mx-5 mb-3 px-4 py-3 rounded-xl text-xs flex-shrink-0" style={{background:"rgba(6,182,212,0.07)", border:"1px solid rgba(6,182,212,0.2)"}}>
                      <p className="text-cyan-400 font-semibold mb-1.5 flex items-center gap-1.5">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="2"/></svg>
                        Live web sources
                      </p>
                      <div className="space-y-1">
                        {liveSources.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            className="block truncate text-cyan-300/70 hover:text-cyan-300 transition-colors">
                            {url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
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
                        onClick={() => handleSendChat()}
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

              {/* ── Quiz Tab ── */}
              {chatTab === "quiz" && (
                <div className="flex-1 overflow-y-auto px-5 py-4" style={{minHeight:0}}>
                  {quizLoading && (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/>
                      </svg>
                      <p className="text-sm text-white/40 animate-pulse">Generating quiz questions…</p>
                    </div>
                  )}
                  {!quizLoading && quizQuestions.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{background:"rgba(245,158,11,0.1)"}}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <p className="text-sm text-white/35">Select a document and click Quiz Me to generate questions.</p>
                    </div>
                  )}
                  {!quizLoading && quizQuestions.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-white">{quizQuestions.length} Questions</h3>
                        {quizSubmitted && (
                          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{background:"rgba(16,185,129,0.15)", color:"#34d399"}}>
                            Score: {quizQuestions.filter((_, qi) => quizAnswers[qi] === _.correct_index).length}/{quizQuestions.length}
                          </span>
                        )}
                      </div>
                      {quizQuestions.map((q, qi) => {
                        const selected = quizAnswers[qi];
                        const isCorrect = quizSubmitted && selected === q.correct_index;
                        const isWrong = quizSubmitted && selected !== undefined && selected !== q.correct_index;
                        return (
                          <div key={qi} className="rounded-2xl p-4 space-y-3" style={{background:"rgba(255,255,255,0.03)", border:`1px solid ${isCorrect ? "rgba(16,185,129,0.3)" : isWrong ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.07)"}`}}>
                            <p className="text-sm font-semibold text-white/90">
                              <span className="text-amber-400 mr-2">Q{qi+1}.</span>{q.question}
                            </p>
                            <div className="space-y-2">
                              {q.options.map((opt, oi) => {
                                const isSelected = selected === oi;
                                const isCorrectOpt = quizSubmitted && oi === q.correct_index;
                                const isWrongSelected = quizSubmitted && isSelected && oi !== q.correct_index;
                                return (
                                  <button
                                    key={oi}
                                    onClick={() => { if (!quizSubmitted) setQuizAnswers(prev => ({...prev, [qi]: oi})); }}
                                    disabled={quizSubmitted}
                                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all"
                                    style={{
                                      background: isCorrectOpt ? "rgba(16,185,129,0.18)" : isWrongSelected ? "rgba(239,68,68,0.18)" : isSelected ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                                      border: `1px solid ${isCorrectOpt ? "rgba(16,185,129,0.5)" : isWrongSelected ? "rgba(239,68,68,0.5)" : isSelected ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.07)"}`,
                                      color: isCorrectOpt ? "#34d399" : isWrongSelected ? "#f87171" : isSelected ? "rgba(165,180,252,0.9)" : "rgba(255,255,255,0.55)",
                                    }}
                                  >
                                    <span className="font-bold mr-2">{String.fromCharCode(65+oi)}.</span>{opt}
                                  </button>
                                );
                              })}
                            </div>
                            {quizSubmitted && q.explanation && (
                              <div className="px-3 py-2 rounded-xl text-xs" style={{background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.2)"}}>
                                <span className="text-indigo-300 font-semibold">Explanation: </span>
                                <span className="text-white/55">{q.explanation}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {!quizSubmitted && (
                        <button
                          onClick={() => setQuizSubmitted(true)}
                          disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                          className="w-full py-3 rounded-2xl text-sm font-bold transition-all mt-2 disabled:opacity-40"
                          style={{background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"white"}}
                        >
                          Submit Quiz ({Object.keys(quizAnswers).length}/{quizQuestions.length} answered)
                        </button>
                      )}
                      {quizSubmitted && (
                        <button
                          onClick={() => handleStartQuiz()}
                          className="w-full py-3 rounded-2xl text-sm font-bold transition-all mt-2"
                          style={{background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.3)", color:"#fbbf24"}}
                        >
                          Retake Quiz
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>{/* end desktop layout */}

      {/* ══════════════════════════════════════════
          MOBILE LAYOUT (< lg)
      ══════════════════════════════════════════ */}
      <div className="lg:hidden flex flex-col" style={{minHeight:"100svh", paddingBottom:"72px"}}>

        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0" style={{background:"rgba(5,5,25,0.82)", backdropFilter:"blur(24px)"}}>
          <div>
            <p className="text-xs text-white/35">{greeting} 👋</p>
            <h1 className="text-lg font-extrabold text-white leading-tight">{userName}</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* doc badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold" style={{background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.3)"}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#a5b4fc" strokeWidth="2" strokeLinejoin="round"/><polyline points="14,2 14,8 20,8" stroke="#a5b4fc" strokeWidth="2" strokeLinejoin="round"/></svg>
              <span className="text-indigo-300">{documents.length}</span>
            </div>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-red-400 transition-colors"
              style={{background:"rgba(255,255,255,0.06)"}}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        {/* ── HOME tab ── */}
        {mobileTab === "home" && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 animate-fade-up">

            {/* Stats strip */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Documents", value: String(documents.length), icon: "📄", color: "#6366f1" },
                { label: "Queries", value: String(chatMessages.filter(m => m.role === "user").length), icon: "⚡", color: "#06b6d4" },
              ].map((s, i) => (
                <div key={i} className="glass-card rounded-2xl p-4" style={{borderColor:`${s.color}22`}}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-2xl font-extrabold text-white">{s.value}</span>
                  </div>
                  <div className="text-xs text-white/40 uppercase tracking-widest">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div>
              <h2 className="text-base font-bold text-white mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (a.action === "upload") fileInputRef.current?.click();
                      else if (a.action === "chat") { handleNewChat(); setMobileTab("chat"); }
                      else if (a.action === "summarize") { handleSummarize(); setMobileTab("chat"); }
                      else if (a.action === "quiz") { handleStartQuiz(); setMobileTab("chat"); }
                    }}
                    className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2 text-center group active:scale-95 transition-transform cursor-pointer"
                    style={{borderColor:`${a.color}22`}}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:a.bg, color:a.color}}>{a.icon}</div>
                    <span className="text-xs font-semibold text-white/80">{a.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Ready status */}
            <div className="glass-card rounded-2xl p-4 flex items-center gap-3" style={{borderColor: selectedDocId ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: selectedDocId ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={selectedDocId ? "#34d399" : "#fbbf24"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{selectedDocId ? "AI Ready" : "No document selected"}</p>
                <p className="text-xs text-white/40 truncate">{selectedDocId ? (documents.find(d => d.id === selectedDocId)?.filename ?? "Document selected") : "Upload or select a document to start chatting"}</p>
              </div>
              {selectedDocId && (
                <button
                  onClick={() => setMobileTab("chat")}
                  className="btn-primary px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0"
                >
                  Chat
                </button>
              )}
            </div>

            {/* Upload zone */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full glass-card rounded-2xl p-5 flex flex-col items-center gap-2 border-dashed active:scale-95 transition-transform disabled:opacity-60"
              style={{borderColor:"rgba(99,102,241,0.4)", borderWidth:"1.5px", borderStyle:"dashed"}}
            >
              {uploading ? (
                <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="60" strokeDashoffset="20"/></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17,8 12,3 7,8" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="3" x2="12" y2="15" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/></svg>
              )}
              <span className="text-sm font-semibold text-indigo-300">{uploading ? "Uploading…" : "Upload Document"}</span>
              <span className="text-xs text-white/30">PDF or TXT</span>
            </button>
          </div>
        )}

        {/* ── DOCS tab ── */}
        {mobileTab === "docs" && (
          <div className="flex-1 overflow-y-auto px-4 py-4 animate-fade-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round"/></svg>
                </div>
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search…" className="input-glass w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"/>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="btn-primary w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" disabled={uploading}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            {docsLoading && <p className="text-xs text-white/30 py-8 text-center">Loading…</p>}
            {!docsLoading && documents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{background:"rgba(99,102,241,0.1)"}}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#6366f1" strokeWidth="1.8"/><polyline points="14,2 14,8 20,8" stroke="#6366f1" strokeWidth="1.8"/></svg>
                </div>
                <p className="text-sm text-white/40">No documents yet</p>
                <button onClick={() => fileInputRef.current?.click()} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold">Upload your first PDF</button>
              </div>
            )}
            <div className="space-y-2.5">
              {filteredDocs.map((doc, i) => {
                const colors = ["#6366f1","#8b5cf6","#06b6d4","#ec4899"];
                const color = colors[i % colors.length];
                const isActive = selectedDocId === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => { handleDocChange(doc.id); setMobileTab("chat"); }}
                    className="glass-card rounded-2xl px-4 py-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
                    style={{ borderColor: isActive ? `${color}55` : undefined, background: isActive ? `${color}10` : undefined, boxShadow: isActive ? `inset 3px 0 0 ${color}` : undefined }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:`${color}18`}}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/><polyline points="14,2 14,8 20,8" stroke={color} strokeWidth="1.8"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{doc.doc_title || doc.filename}</p>
                      <p className="text-xs text-white/35">{new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                    {isActive ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0" style={{background:`${color}22`, color}}>Active</span>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white/25 flex-shrink-0"><polyline points="9,18 15,12 9,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CHAT tab ── */}
        {mobileTab === "chat" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chat panel header */}
            <div className="px-4 pt-3 pb-2 border-b border-white/5 flex-shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-none">AI Assistant</p>
                    <span className="flex items-center gap-1 text-[10px] text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>Online
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setLiveMode(v => !v); setLiveSources([]); }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                    style={liveMode ? {background:"rgba(6,182,212,0.18)",border:"1px solid rgba(6,182,212,0.45)",color:"#06b6d4"} : {background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)"}}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="2"/></svg>
                    Live
                  </button>
                  <button onClick={handleExportChat} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.45)"}}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Export
                  </button>
                </div>
              </div>
              {mobileChatTabs}
              {/* Document selector */}
              {chatTab === "chat" && (
                documents.length > 0 ? (
                  <select value={selectedDocId ?? ""} onChange={(e) => handleDocChange(Number(e.target.value))} className="input-glass w-full px-3 py-2 rounded-xl text-xs">
                    {documents.map(d => <option key={d.id} value={d.id}>{d.filename}</option>)}
                  </select>
                ) : (
                  <button onClick={() => setMobileTab("docs")} className="w-full py-2 rounded-xl text-xs text-indigo-300 font-medium" style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)"}}>
                    Upload a document to start →
                  </button>
                )
              )}
            </div>

            {/* Chat messages */}
            {chatTab === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{minHeight:0}}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 items-end ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      {msg.role === "assistant" && chatLoading && i === chatMessages.length - 1 ? (
                        <AgentThinking phase={msg.content === "" ? "thinking" : "producing"} />
                      ) : msg.role === "assistant" ? (
                        <>
                          <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mb-0.5" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="white"/></svg>
                          </div>
                          <div
                            className="rounded-2xl px-3 py-2.5 text-sm leading-relaxed rounded-bl-sm min-w-0 flex-1 text-white/80"
                            style={{background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)"}}
                          >
                            <MarkdownMessage content={msg.content} role="assistant" />
                          </div>
                        </>
                      ) : (
                        <div
                          className="rounded-2xl px-3 py-2.5 text-sm leading-relaxed rounded-br-sm max-w-[80%] text-white/90"
                          style={{background:"rgba(99,102,241,0.3)"}}
                        >
                          {msg.content}
                        </div>
                      )}
                    </div>
                  ))}
                  {chatError && <p className="text-xs text-red-400">{chatError}</p>}
                  <div ref={chatEndRefMobile}/>
                </div>
                {/* Follow-ups */}
                {followUps.length > 0 && !chatLoading && (
                  <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0" style={{scrollbarWidth:"none"}}>
                    {followUps.map((q, i) => (
                      <button key={i} onClick={() => handleSendChat(q)} className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0" style={{background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.3)",color:"rgba(165,180,252,0.9)"}}>
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                {/* Live sources */}
                {liveSources.length > 0 && (
                  <div className="mx-4 mb-2 px-3 py-2.5 rounded-xl text-xs flex-shrink-0" style={{background:"rgba(6,182,212,0.07)",border:"1px solid rgba(6,182,212,0.2)"}}>
                    <p className="text-cyan-400 font-semibold mb-1 flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="2"/></svg>
                      Live web sources
                    </p>
                    {liveSources.slice(0, 3).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block truncate text-cyan-300/70 hover:text-cyan-300">{url}</a>
                    ))}
                  </div>
                )}
                {/* Input */}
                <div className="px-4 pb-3 pt-2 flex-shrink-0 border-t border-white/5">
                  <div className="flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                      placeholder={selectedDocId ? "Ask about your document…" : "Select a document first…"}
                      disabled={!selectedDocId || chatLoading}
                      className="input-glass flex-1 px-4 py-3 rounded-xl text-sm disabled:opacity-40"
                    />
                    <button
                      onClick={() => handleSendChat()}
                      disabled={!selectedDocId || chatLoading || !chatInput.trim()}
                      className="btn-primary w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22 11 13 2 9l20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* History tab */}
            {chatTab === "history" && (
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{minHeight:0}}>
                {/* Doc selector for history */}
                <div className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
                  {documents.map((doc, i) => {
                    const color = ["#6366f1","#8b5cf6","#06b6d4","#ec4899"][i % 4];
                    const active = historyDocId === doc.id;
                    return (
                      <button key={doc.id} onClick={() => handleHistoryDocSelect(doc.id)} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all" style={active ? {background:`${color}22`, border:`1px solid ${color}66`, color} : {background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)"}}>
                        {doc.filename.length > 18 ? doc.filename.slice(0,18) + "…" : doc.filename}
                      </button>
                    );
                  })}
                </div>
                {historyLoading && (
                  <div className="flex justify-center py-8"><svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/></svg></div>
                )}
                {!historyLoading && historyRecords.length === 0 && historyDocId && (
                  <p className="text-sm text-white/30 text-center py-8">No history for this document yet.</p>
                )}
                {!historyDocId && (
                  <p className="text-sm text-white/30 text-center py-8">Select a document above to view its history.</p>
                )}
                {historyRecords.map((record, i) => (
                  <div key={record.id} className="rounded-2xl p-3.5 space-y-2.5" style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)"}}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:"rgba(99,102,241,0.2)",color:"#818cf8"}}>#{historyRecords.length - i}</span>
                      <span className="text-[10px] text-white/25">{new Date(record.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-end">
                      <div className="rounded-2xl rounded-tr-sm px-3 py-2 text-xs text-white/85 max-w-[90%]" style={{background:"rgba(99,102,241,0.22)"}}>{record.question}</div>
                    </div>
                    <div className="flex gap-2 items-start">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="white"/></svg>
                      </div>
                      <div className="rounded-2xl rounded-tl-sm px-3 py-2 flex-1 min-w-0" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)"}}>
                        <MarkdownMessage content={record.answer} role="assistant" compact />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quiz tab */}
            {chatTab === "quiz" && (
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{minHeight:0}}>
                {quizLoading && (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/></svg>
                    <p className="text-sm text-white/40 animate-pulse">Generating questions…</p>
                  </div>
                )}
                {!quizLoading && quizQuestions.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{background:"rgba(245,158,11,0.1)"}}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <p className="text-sm text-white/35">Select a document and tap Quiz Me to start.</p>
                    <button onClick={handleStartQuiz} disabled={!selectedDocId} className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40">Start Quiz</button>
                  </div>
                )}
                {!quizLoading && quizQuestions.length > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{quizQuestions.length} Questions</span>
                      {quizSubmitted && <span className="text-xs font-bold px-3 py-1 rounded-full" style={{background:"rgba(16,185,129,0.15)",color:"#34d399"}}>Score: {quizQuestions.filter((_, qi) => quizAnswers[qi] === _.correct_index).length}/{quizQuestions.length}</span>}
                    </div>
                    {quizQuestions.map((q, qi) => {
                      const selected = quizAnswers[qi];
                      const isCorrect = quizSubmitted && selected === q.correct_index;
                      const isWrong = quizSubmitted && selected !== undefined && selected !== q.correct_index;
                      return (
                        <div key={qi} className="rounded-2xl p-4 space-y-3" style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${isCorrect?"rgba(16,185,129,0.3)":isWrong?"rgba(239,68,68,0.3)":"rgba(255,255,255,0.07)"}`}}>
                          <p className="text-sm font-semibold text-white/90"><span className="text-amber-400 mr-1.5">Q{qi+1}.</span>{q.question}</p>
                          <div className="space-y-2">
                            {q.options.map((opt, oi) => {
                              const isSel = selected === oi;
                              const isCorrectOpt = quizSubmitted && oi === q.correct_index;
                              const isWrongSel = quizSubmitted && isSel && oi !== q.correct_index;
                              return (
                                <button key={oi} onClick={() => { if (!quizSubmitted) setQuizAnswers(prev => ({...prev,[qi]:oi})); }} disabled={quizSubmitted}
                                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
                                  style={{
                                    background: isCorrectOpt?"rgba(16,185,129,0.18)":isWrongSel?"rgba(239,68,68,0.18)":isSel?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.04)",
                                    border:`1px solid ${isCorrectOpt?"rgba(16,185,129,0.5)":isWrongSel?"rgba(239,68,68,0.5)":isSel?"rgba(99,102,241,0.5)":"rgba(255,255,255,0.07)"}`,
                                    color: isCorrectOpt?"#34d399":isWrongSel?"#f87171":isSel?"rgba(165,180,252,0.9)":"rgba(255,255,255,0.55)",
                                  }}
                                >
                                  <span className="font-bold mr-2">{String.fromCharCode(65+oi)}.</span>{opt}
                                </button>
                              );
                            })}
                          </div>
                          {quizSubmitted && q.explanation && (
                            <div className="px-3 py-2 rounded-xl text-xs" style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)"}}>
                              <span className="text-indigo-300 font-semibold">Explanation: </span>
                              <span className="text-white/55">{q.explanation}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!quizSubmitted ? (
                      <button onClick={() => setQuizSubmitted(true)} disabled={Object.keys(quizAnswers).length < quizQuestions.length} className="w-full py-3 rounded-2xl text-sm font-bold disabled:opacity-40" style={{background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"white"}}>
                        Submit ({Object.keys(quizAnswers).length}/{quizQuestions.length} answered)
                      </button>
                    ) : (
                      <button onClick={handleStartQuiz} className="w-full py-3 rounded-2xl text-sm font-bold" style={{background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.3)",color:"#fbbf24"}}>Retake Quiz</button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Mobile bottom navigation ── */}
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch" style={{background:"rgba(4,4,20,0.92)", backdropFilter:"blur(28px)", borderTop:"1px solid rgba(255,255,255,0.08)", height:"68px"}}>
          {[
            { key:"home", label:"Home", icon:(
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )},
            { key:"docs", label:"Docs", icon:(
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
            )},
            { key:"chat", label:"Chat", icon:(
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )},
          ].map((tab) => {
            const isActive = mobileTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setMobileTab(tab.key as "home"|"docs"|"chat")}
                className="flex-1 flex flex-col items-center justify-center gap-1 transition-all"
                style={{color: isActive ? "#a5b4fc" : "rgba(255,255,255,0.3)"}}
              >
                {tab.icon}
                <span className="text-[10px] font-semibold">{tab.label}</span>
                {isActive && <span className="w-4 h-0.5 rounded-full" style={{background:"linear-gradient(90deg,#6366f1,#8b5cf6)"}}/>}
              </button>
            );
          })}
        </div>
      </div>{/* end mobile layout */}
    </div>
  );
}
