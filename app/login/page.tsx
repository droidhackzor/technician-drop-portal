'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('tech@example.com');
  const [password, setPassword] = useState('MasterPass123');
  const [error, setError] = useState(searchParams.get('error') || '');
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
    <main className="login-page">
      <div className="login-card">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="badge">
            Secure login
          </div>
          <ThemeToggle />
        </div>

        <h1>Sign in</h1>

        <p
          style={{
            margin: '10px 0 24px',
            fontSize: 14,
            color: 'var(--text-muted, #6b7280)',
          }}
        >
          Technician Drop Portal
        </p>

        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          <button
            type="button"
            disabled
            title="Microsoft login is not fully configured yet"
            style={{
              width: '100%',
              borderRadius: 16,
              border: '1px solid var(--border-medium, rgba(15,23,42,0.12))',
              background: 'var(--bg-soft, #f8fafc)',
              color: 'var(--text-muted, #6b7280)',
              fontSize: 15,
              fontWeight: 700,
              padding: '14px 16px',
              textAlign: 'center',
              boxSizing: 'border-box' as const,
              cursor: 'not-allowed',
              opacity: 0.8,
            }}
          >
            Continue with Microsoft
          </button>
          <div
            style={{
              borderRadius: 16,
              border: '1px solid #fde68a',
              background: '#fffbeb',
              color: '#92400e',
              padding: '12px 14px',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Microsoft login is visible but not complete yet. Please use your email and password for now.
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: 'var(--text-muted, #9ca3af)',
              fontSize: 12,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'var(--border-medium, rgba(15,23,42,0.08))' }} />
            or
            <div style={{ flex: 1, height: 1, background: 'var(--border-medium, rgba(15,23,42,0.08))' }} />
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 8,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: 'var(--text-muted, #6b7280)',
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
                textTransform: 'uppercase' as const,
                color: 'var(--text-muted, #6b7280)',
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
                background: 'var(--bg-error, #fef2f2)',
                color: 'var(--text-error, #b91c1c)',
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
              background: 'var(--text-strong, #111827)',
              color: 'var(--bg-input, #fff)',
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
            border: '1px solid var(--border-medium, rgba(15,23,42,0.08))',
            background: 'var(--bg-soft, #f8fafc)',
            padding: 14,
            fontSize: 14,
            color: 'var(--text-muted, #52525b)',
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: 'var(--text-strong, #111827)' }}>Demo accounts</strong>
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
  border: '1px solid var(--border-medium, rgba(15,23,42,0.1))',
  background: 'var(--bg-input, #fff)',
  color: 'var(--text-strong, #111827)',
  fontSize: 14,
  padding: '12px 14px',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-soft, #f4f6fb)' }} />}>
      <LoginForm />
    </Suspense>
  );
}
