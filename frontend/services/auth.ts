// services/auth.ts
// API abstraction for authentication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function signupUser({ name, email, password }: { name: string; email: string; password: string }) {
  const res = await fetch(`${API_BASE_URL}/api/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Signup failed');
  }
  return res.json();
}

export async function loginUser({ email, password }: { email: string; password: string }) {
  const res = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Login failed');
  }
  return res.json();
}
