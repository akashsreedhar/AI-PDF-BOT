"use client";
// app/signup/page.tsx
import AuthForm from '../../components/AuthForm';

export default function SignupPage() {
  // Placeholder for form submission logic
  const handleSignup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Connect to API
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-br from-white via-indigo-50 to-indigo-100 py-12">
      <AuthForm type="signup" onSubmit={handleSignup} />
    </div>
  );
}
