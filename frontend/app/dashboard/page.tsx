"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      router.replace('/login');
    }
  }, [router]);
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-br from-white via-indigo-50 to-indigo-100 py-12">
      <div className="bg-white/90 rounded-2xl shadow-xl p-8 border border-gray-100 backdrop-blur max-w-2xl w-full text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to your Dashboard!</h1>
        <p className="text-lg text-gray-700">This is a protected area. You can customize this page with your app's features.</p>
      </div>
    </div>
  );
}
