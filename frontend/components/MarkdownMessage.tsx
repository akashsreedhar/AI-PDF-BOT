"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface Props {
  content: string;
  /** "assistant" bubble (dark bg) or "user" bubble (indigo bg) */
  role?: "assistant" | "user";
  /** smaller text for history view */
  compact?: boolean;
}

export default function MarkdownMessage({ content, role = "assistant", compact = false }: Props) {
  const base = compact ? "text-xs" : "text-sm";

  const components: Components = {
    // Paragraphs
    p({ children }) {
      return <p className={`${base} leading-relaxed mb-2 last:mb-0 text-inherit`}>{children}</p>;
    },

    // Headings
    h1({ children }) {
      return (
        <h1 className={`font-extrabold text-white mb-3 mt-4 first:mt-0 ${compact ? "text-sm" : "text-base"} border-b border-white/10 pb-1`}>
          {children}
        </h1>
      );
    },
    h2({ children }) {
      return (
        <h2 className={`font-bold text-white/90 mb-2 mt-4 first:mt-0 ${compact ? "text-xs" : "text-sm"}`}>
          {children}
        </h2>
      );
    },
    h3({ children }) {
      return (
        <h3 className={`font-semibold text-white/80 mb-1.5 mt-3 first:mt-0 ${compact ? "text-xs" : "text-sm"}`}>
          {children}
        </h3>
      );
    },

    // Bold / Italic
    strong({ children }) {
      return <strong className="font-semibold text-white">{children}</strong>;
    },
    em({ children }) {
      return <em className="italic text-indigo-300">{children}</em>;
    },

    // Lists
    ul({ children }) {
      return <ul className={`space-y-1.5 my-2 pl-0 list-none ${base}`}>{children}</ul>;
    },
    ol({ children }) {
      return <ol className={`space-y-1.5 my-2 pl-0 list-none ${base}`}>{children}</ol>;
    },
    li({ children }) {
      return (
        <li className="flex items-start gap-2 text-inherit leading-relaxed">
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[7px]" style={{background:"#6366f1"}} />
          <span className="flex-1 min-w-0">{children}</span>
        </li>
      );
    },

    // Inline code
    code({ children, className }) {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <div className="my-3 rounded-xl overflow-hidden" style={{background:"rgba(0,0,0,0.4)", border:"1px solid rgba(99,102,241,0.2)"}}>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"/>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"/>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"/>
              <span className="ml-auto text-[10px] text-white/25 font-mono">{className?.replace("language-","") ?? "code"}</span>
            </div>
            <pre className="overflow-x-auto px-4 py-3">
              <code className="text-xs font-mono text-indigo-200 leading-relaxed">{children}</code>
            </pre>
          </div>
        );
      }
      return (
        <code className="px-1.5 py-0.5 rounded-md text-[0.8em] font-mono"
          style={{background:"rgba(99,102,241,0.2)", color:"#a5b4fc"}}>
          {children}
        </code>
      );
    },

    // Blockquote
    blockquote({ children }) {
      return (
        <blockquote className="my-2 pl-3 border-l-2 border-indigo-400/50 text-white/60 italic">
          {children}
        </blockquote>
      );
    },

    // Horizontal rule
    hr() {
      return <hr className="my-3 border-white/10" />;
    },

    // Tables
    table({ children }) {
      return (
        <div className="my-3 overflow-x-auto rounded-xl" style={{border:"1px solid rgba(99,102,241,0.2)"}}>
          <table className="w-full text-left border-collapse">{children}</table>
        </div>
      );
    },
    thead({ children }) {
      return (
        <thead style={{background:"rgba(99,102,241,0.15)"}}>{children}</thead>
      );
    },
    th({ children }) {
      return (
        <th className={`px-3 py-2 ${compact ? "text-[10px]" : "text-xs"} font-semibold text-indigo-300 uppercase tracking-wide border-b whitespace-nowrap`}
          style={{borderColor:"rgba(99,102,241,0.2)"}}>
          {children}
        </th>
      );
    },
    tbody({ children }) {
      return <tbody>{children}</tbody>;
    },
    tr({ children }) {
      return (
        <tr className="border-b transition-colors hover:bg-white/[0.02]"
          style={{borderColor:"rgba(255,255,255,0.05)"}}>
          {children}
        </tr>
      );
    },
    td({ children }) {
      return (
        <td className={`px-3 py-2 ${compact ? "text-[10px]" : "text-xs"} text-white/75 leading-relaxed align-top`}>
          {children}
        </td>
      );
    },

    // Links
    a({ href, children }) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors break-all">
          {children}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 opacity-60">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <polyline points="15,3 21,3 21,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </a>
      );
    },
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
