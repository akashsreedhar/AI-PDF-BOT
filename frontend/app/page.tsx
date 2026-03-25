import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="max-w-2xl w-full text-center flex flex-col items-center gap-8">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-600 shadow-lg mb-2">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 10h16M4 14h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><circle cx="19" cy="17" r="3" fill="#fff" fillOpacity="0.9"/></svg>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
          Welcome to <span className="text-indigo-600">AI Doc Chat</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-md">
          Your intelligent assistant for document Q&amp;A, search, and more. Sign up or log in to get started!
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/login" className="px-8 py-3 rounded-lg bg-indigo-600 text-white font-semibold text-lg shadow hover:bg-indigo-700 transition-colors">
            Login
          </Link>
          <Link href="/signup" className="px-8 py-3 rounded-lg border-2 border-indigo-600 text-indigo-600 font-semibold text-lg hover:bg-indigo-50 transition-colors">
            Sign Up
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 w-full">
          <div className="bg-white rounded-xl shadow p-5 border border-gray-100 text-left">
            <div className="text-2xl mb-2">📄</div>
            <h3 className="font-bold text-gray-900 mb-1">Upload Documents</h3>
            <p className="text-gray-500 text-sm">Upload PDFs, Word docs, and more for instant AI-powered analysis.</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border border-gray-100 text-left">
            <div className="text-2xl mb-2">💬</div>
            <h3 className="font-bold text-gray-900 mb-1">Ask Questions</h3>
            <p className="text-gray-500 text-sm">Chat naturally with your documents and get precise answers instantly.</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border border-gray-100 text-left">
            <div className="text-2xl mb-2">🔒</div>
            <h3 className="font-bold text-gray-900 mb-1">Secure & Private</h3>
            <p className="text-gray-500 text-sm">Your data stays private with secure authentication and storage.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
