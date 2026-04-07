'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('tech@example.com');
  const [password, setPassword] = useState('tech1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Login failed' }));
      setError(data.error || 'Login failed');
      return;
    }

    router.push(params.get('next') || '/dashboard');
    router.refresh();
  }

  return (
    <form className="panel card login-panel" onSubmit={onSubmit}>
      <div className="badge">Secure sign in</div>
      <h2 className="login-title">Access the portal</h2>
      <p className="helper" style={{ marginTop: 0 }}>
        Technicians can submit field evidence. Leadership can review and search the full incident queue.
      </p>
      {error ? <div className="notice">{error}</div> : null}
      <div className="field">
        <label className="label">Email</label>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label className="label">Password</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button className="button" type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Continue'}
      </button>
      <div className="mini-list">
        <div className="mini-item">
          <strong>Technician demo</strong>
          tech@example.com / tech1234
        </div>
        <div className="mini-item">
          <strong>Leadership demo</strong>
          leader@example.com / leader1234
        </div>
      </div>
    </form>
  );
}
