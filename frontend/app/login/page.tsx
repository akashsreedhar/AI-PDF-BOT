"use client";
// app/login/page.tsx

import AuthForm from '../../components/AuthForm';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '../../services/auth';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    try {
      const result = await loginUser({ email, password });
      if (result.token) {
        localStorage.setItem('jwt', result.token);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-br from-white via-indigo-50 to-indigo-100 py-12">
      <AuthForm type="login" onSubmit={handleLogin} isLoading={isLoading} error={error || undefined} />
    </div>
  );
}
