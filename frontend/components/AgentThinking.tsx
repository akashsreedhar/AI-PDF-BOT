"use client";
import { useEffect, useState } from "react";

type Phase = "thinking" | "producing";
interface Props { phase: Phase; }

const THOUGHTS = [
  "Reading your document…",
  "Connecting the dots…",
  "Cross-checking facts…",
  "Almost there…",
  "Crafting the answer…",
];

/* ─── Thinking human SVG ─────────────────────────────────────── */
function ThinkingHuman() {
  return (
    <svg width="64" height="80" viewBox="0 0 64 80" fill="none">
      {/* Thought bubble dots */}
      <circle cx="36" cy="26" r="2.2" fill="rgba(139,92,246,0.9)" style={{animation:"rise 1.8s ease-in-out 0s infinite"}}/>
      <circle cx="43" cy="17" r="3.2" fill="rgba(139,92,246,0.7)" style={{animation:"rise 1.8s ease-in-out 0.25s infinite"}}/>
      {/* Thought cloud */}
      <ellipse cx="52" cy="9" rx="11" ry="7.5" fill="rgba(99,102,241,0.15)" stroke="rgba(139,92,246,0.55)" strokeWidth="1.2" style={{animation:"cloudPop 1.8s ease-in-out 0.5s infinite"}}/>
      <text x="46" y="13" fontSize="8" fill="rgba(200,190,255,0.85)" fontFamily="sans-serif">💡</text>
      {/* Head */}
      <circle cx="22" cy="19" r="11" fill="rgba(99,102,241,0.22)" stroke="rgba(139,92,246,0.75)" strokeWidth="1.6"/>
      {/* Eyes blinking */}
      <ellipse cx="18.5" cy="18" rx="1.6" ry="1.9" fill="white" style={{animation:"blink 3.2s ease-in-out infinite"}}/>
      <ellipse cx="25.5" cy="18" rx="1.6" ry="1.9" fill="white" style={{animation:"blink 3.2s ease-in-out infinite"}}/>
      <circle cx="19" cy="18.5" r="0.9" fill="#6366f1"/>
      <circle cx="26" cy="18.5" r="0.9" fill="#6366f1"/>
      {/* Raised eyebrow — thinking */}
      <path d="M16 14.5 Q20 13 24 14" stroke="rgba(200,190,255,0.7)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      {/* Tilted thinking mouth */}
      <path d="M18 23.5 Q22 22.5 26 23.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      {/* Hand on chin */}
      <path d="M16 29 Q12 35 14 42" stroke="rgba(139,92,246,0.75)" strokeWidth="2.2" strokeLinecap="round" style={{animation:"chinRub 2s ease-in-out infinite"}}/>
      <ellipse cx="14" cy="43" rx="3.5" ry="3" fill="rgba(99,102,241,0.28)" stroke="rgba(139,92,246,0.65)" strokeWidth="1.2"/>
      {/* Body */}
      <path d="M11 30 Q9 45 10 58 Q14 62 22 62 Q30 62 34 58 Q35 45 33 30 Q27 26 22 26 Q17 26 11 30Z" fill="rgba(99,102,241,0.18)" stroke="rgba(139,92,246,0.4)" strokeWidth="1.2"/>
      {/* Other arm */}
      <path d="M33 33 Q40 39 38 45" stroke="rgba(139,92,246,0.55)" strokeWidth="2" strokeLinecap="round"/>
      {/* Legs */}
      <path d="M16 59 Q15 68 14 75" stroke="rgba(139,92,246,0.6)" strokeWidth="3" strokeLinecap="round"/>
      <path d="M28 59 Q29 68 30 75" stroke="rgba(139,92,246,0.6)" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── Writing human SVG ──────────────────────────────────────── */
function WritingHuman() {
  return (
    <svg width="64" height="80" viewBox="0 0 64 80" fill="none">
      {/* Paper / notebook */}
      <rect x="26" y="46" width="30" height="24" rx="3" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.5)" strokeWidth="1.3"/>
      {/* Lines being written */}
      <line x1="30" y1="52" x2="51" y2="52" stroke="rgba(16,185,129,0.5)" strokeWidth="1.1" strokeLinecap="round" style={{animation:"writeLine 0.9s ease-in-out 0s infinite alternate"}}/>
      <line x1="30" y1="57" x2="47" y2="57" stroke="rgba(16,185,129,0.5)" strokeWidth="1.1" strokeLinecap="round" style={{animation:"writeLine 0.9s ease-in-out 0.18s infinite alternate"}}/>
      <line x1="30" y1="62" x2="50" y2="62" stroke="rgba(16,185,129,0.5)" strokeWidth="1.1" strokeLinecap="round" style={{animation:"writeLine 0.9s ease-in-out 0.36s infinite alternate"}}/>
      {/* Pen tip glow */}
      <circle cx="51" cy="46" r="2.2" fill="#10b981" style={{animation:"penSpark 0.45s ease-in-out infinite alternate"}}/>
      {/* Head leaning forward */}
      <circle cx="19" cy="17" r="11" fill="rgba(16,185,129,0.18)" stroke="rgba(16,185,129,0.7)" strokeWidth="1.6"/>
      {/* Focused eyes */}
      <ellipse cx="15.5" cy="16" rx="1.6" ry="1.3" fill="white"/>
      <ellipse cx="22.5" cy="16" rx="1.6" ry="1.3" fill="white"/>
      <circle cx="16" cy="16.3" r="0.8" fill="#10b981"/>
      <circle cx="23" cy="16.3" r="0.8" fill="#10b981"/>
      {/* Smile */}
      <path d="M15 22 Q19 24.5 23 22" stroke="rgba(255,255,255,0.65)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      {/* Body */}
      <path d="M8 28 Q6 43 8 57 Q12 61 19 61 Q26 61 30 57 Q32 43 30 28 Q24 24 19 24 Q14 24 8 28Z" fill="rgba(16,185,129,0.14)" stroke="rgba(16,185,129,0.4)" strokeWidth="1.2"/>
      {/* Writing arm animating */}
      <path d="M28 32 Q37 38 43 44 Q48 46 51 46" stroke="rgba(16,185,129,0.82)" strokeWidth="2.2" strokeLinecap="round" style={{animation:"writeArm 0.55s ease-in-out infinite alternate"}}/>
      {/* Other arm */}
      <path d="M10 31 Q6 40 8 49" stroke="rgba(16,185,129,0.45)" strokeWidth="2" strokeLinecap="round"/>
      {/* Legs */}
      <path d="M13 58 Q12 67 11 75" stroke="rgba(16,185,129,0.55)" strokeWidth="3" strokeLinecap="round"/>
      <path d="M25 58 Q26 67 27 75" stroke="rgba(16,185,129,0.55)" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export default function AgentThinking({ phase }: Props) {
  const [thought, setThought] = useState(0);
  const [dots, setDots]       = useState(0);
  const [flash, setFlash]     = useState(false);

  useEffect(() => {
    if (phase !== "thinking") return;
    const id = setInterval(() => setThought((t) => (t + 1) % THOUGHTS.length), 1600);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 450);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (phase === "producing") { setFlash(true); setTimeout(() => setFlash(false), 600); }
  }, [phase]);

  return (
    <div className="flex items-start gap-3 w-full">
      {/* ── Character ── */}
      <div
        className="relative flex-shrink-0"
        style={{
          width: 72, height: 90,
          filter: phase === "thinking"
            ? "drop-shadow(0 0 14px rgba(99,102,241,0.6))"
            : "drop-shadow(0 0 14px rgba(16,185,129,0.6))",
          transition: "filter 0.7s ease",
        }}
      >
        {flash && (
          <div className="absolute inset-0 rounded-2xl z-10 pointer-events-none"
            style={{background:"rgba(16,185,129,0.3)", animation:"flashOut 0.6s ease forwards"}}/>
        )}
        {phase === "thinking" ? <ThinkingHuman /> : <WritingHuman />}
        {/* Phase label under character */}
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
          style={{
            background: phase === "thinking" ? "rgba(99,102,241,0.18)" : "rgba(16,185,129,0.18)",
            border: `1px solid ${phase === "thinking" ? "rgba(139,92,246,0.4)" : "rgba(16,185,129,0.4)"}`,
            color: phase === "thinking" ? "#c4b5fd" : "#6ee7b7",
            transition: "all 0.6s ease",
          }}
        >
          {phase === "thinking" ? "thinking…" : "writing…"}
        </div>
      </div>

      {/* ── Speech bubble ── */}
      <div
        className="rounded-2xl rounded-tl-sm px-4 py-3 flex-1"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${phase === "thinking" ? "rgba(99,102,241,0.22)" : "rgba(16,185,129,0.22)"}`,
          transition: "border-color 0.6s ease",
          minWidth: 180,
        }}
      >
        {phase === "thinking" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"/>
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">
                Thinking{".".repeat(dots)}
              </span>
            </div>
            <p key={thought} className="text-sm text-white/80 leading-snug" style={{animation:"fadeSlideUp 0.4s ease"}}>
              {THOUGHTS[thought]}
            </p>
            {/* Neuron bars */}
            <div className="flex gap-1 items-end h-5">
              {Array.from({length:10}).map((_,i) => (
                <div key={i} className="rounded-full flex-1"
                  style={{
                    background:`rgba(99,102,241,${0.3+(i%3)*0.25})`,
                    animation:`neuron 1.1s ease-in-out ${i*0.1}s infinite alternate`,
                  }}/>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" style={{animation:"penSpark 0.5s ease-in-out infinite alternate"}}/>
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest">
                Writing{".".repeat(dots)}
              </span>
            </div>
            <div className="space-y-2">
              {[92,76,85,62].map((w,i) => (
                <div key={i} className="relative h-2.5 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.05)"}}>
                  <div className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      background:"linear-gradient(90deg,rgba(16,185,129,0.7),rgba(6,182,212,0.5))",
                      animation:`typeBar 1.4s cubic-bezier(.4,0,.6,1) ${i*0.18}s infinite`,
                      maxWidth:`${w}%`,
                    }}/>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-0.5 h-4 rounded-full bg-emerald-400" style={{animation:"cursorBlink 0.8s step-end infinite"}}/>
              <span className="text-xs text-white/30">composing response…</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes rise {
          0%,100%{transform:translateY(0) scale(1);opacity:.9}
          50%{transform:translateY(-7px) scale(1.1);opacity:.4}
        }
        @keyframes cloudPop {
          0%,100%{transform:scale(1);opacity:.6}
          50%{transform:scale(1.08);opacity:1}
        }
        @keyframes blink {
          0%,88%,100%{transform:scaleY(1)}
          94%{transform:scaleY(0.08)}
        }
        @keyframes chinRub {
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(4px)}
        }
        @keyframes writeArm {
          0%{transform:translateX(0) translateY(0)}
          100%{transform:translateX(7px) translateY(-4px)}
        }
        @keyframes writeLine {
          0%{opacity:.15;transform-origin:left;transform:scaleX(.5)}
          100%{opacity:.85;transform-origin:left;transform:scaleX(1)}
        }
        @keyframes penSpark {
          0%{opacity:.35;transform:scale(.75)}
          100%{opacity:1;transform:scale(1.4)}
        }
        @keyframes neuron {
          0%{height:3px}
          100%{height:20px}
        }
        @keyframes typeBar {
          0%{width:0}
          60%,100%{width:100%}
        }
        @keyframes cursorBlink {
          0%,100%{opacity:1}
          50%{opacity:0}
        }
        @keyframes fadeSlideUp {
          from{opacity:0;transform:translateY(7px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes flashOut {
          from{opacity:1}
          to{opacity:0}
        }
      `}</style>
    </div>
  );
}
