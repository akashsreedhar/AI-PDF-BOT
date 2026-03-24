// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from '../components/Navbar';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Document Chatbot",
  description: "Chat with your documents using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-gradient-to-br from-gray-50 via-white to-indigo-50 min-h-screen text-gray-900 font-sans">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-10 md:py-16 flex-1 w-full">{children}</main>
      </body>
    </html>
  );
}
