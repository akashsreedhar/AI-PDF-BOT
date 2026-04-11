// services/auth.ts
// API abstraction for authentication

import { API_BASE_URL } from './api';

async function parseError(res: Response, fallback: string): Promise<Error> {
  try {
    const data = await res.json();
    const message = data.detail || data.message || fallback;
    return new Error(message);
  } catch {
    return new Error(fallback);
  }
}

export async function signupUser({ name, email, password }: { name: string; email: string; password: string }) {
  const res = await fetch(`${API_BASE_URL}/api/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    throw await parseError(res, 'Signup failed');
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
    throw await parseError(res, 'Login failed');
  }
  return res.json();
}

export async function forgotPassword({ email }: { email: string }) {
  const res = await fetch(`${API_BASE_URL}/api/forgot_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    throw await parseError(res, 'Failed to send reset email');
  }
  return res.json();
}

export async function resetPassword({ token, new_password }: { token: string; new_password: string }) {
  const res = await fetch(`${API_BASE_URL}/api/reset_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password }),
  });
  if (!res.ok) {
    throw await parseError(res, 'Failed to reset password');
  }
  return res.json();
}

export async function googleAuth({ idToken }: { idToken: string }) {
  const res = await fetch(`${API_BASE_URL}/api/google-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!res.ok) {
    throw await parseError(res, 'Google signup failed');
  }
  return res.json();
}
