"use client";
// app/signup/page.tsx

import AuthForm from '../../components/AuthForm';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signupUser } from '../../services/auth';

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    try {
      const result = await signupUser({ name, email, password });
      if (result.token) {
        localStorage.setItem('jwt', result.token);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-br from-white via-indigo-50 to-indigo-100 py-12">
      <AuthForm type="signup" onSubmit={handleSignup} isLoading={isLoading} error={error || undefined} />
    </div>
  );
}
