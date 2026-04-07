'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('tech@example.com');
  const [password, setPassword] = useState('MasterPass123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Login failed');
        setLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('Login failed');
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(circle at top, #fbfcfe 0%, #f4f6fb 45%, #edf2f7 100%)',
        padding: 16,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(15,23,42,0.08)',
          borderRadius: 28,
          boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
          padding: 24,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            borderRadius: 999,
            border: '1px solid rgba(15,23,42,0.08)',
            background: '#f8fafc',
            color: '#52525b',
            fontSize: 12,
            fontWeight: 600,
            padding: '6px 10px',
            marginBottom: 14,
          }}
        >
          Secure login
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 40,
            lineHeight: 1,
            letterSpacing: '-0.05em',
            color: '#111827',
            fontWeight: 700,
          }}
        >
          Sign in
        </h1>

        <p
          style={{
            margin: '10px 0 24px',
            fontSize: 14,
            color: '#6b7280',
          }}
        >
          Technician Drop Portal
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 8,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#6b7280',
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 8,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#6b7280',
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={inputStyle}
            />
          </div>

          {error ? (
            <div
              style={{
                borderRadius: 16,
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#b91c1c',
                padding: '12px 14px',
                fontSize: 14,
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              borderRadius: 16,
              border: 'none',
              background: '#111827',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              padding: '14px 16px',
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            borderRadius: 18,
            border: '1px solid rgba(15,23,42,0.08)',
            background: '#f8fafc',
            padding: 14,
            fontSize: 14,
            color: '#52525b',
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: '#111827' }}>Demo accounts</strong>
          <br />
          tech@example.com / MasterPass123
          <br />
          leader@example.com / MasterPass123
        </div>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 16,
  border: '1px solid rgba(15,23,42,0.1)',
  background: '#fff',
  color: '#111827',
  fontSize: 14,
  padding: '12px 14px',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f4f6fb' }} />}>
      <LoginForm />
    </Suspense>
  );
}
