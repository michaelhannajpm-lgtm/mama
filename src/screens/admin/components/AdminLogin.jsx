// Login gate — shown until a valid admin token is stored. Exchanges the shared
// password for a signed bearer token via /api/admin/login.
import { useState } from 'react';
import { AC } from '../admin-theme';
import { setAdminToken } from '../lib/adminFetch';

export const AdminLogin = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting || !password) return;
    setSubmitting(true); setErr(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error('API routes need `vercel dev` or a deployed preview to run.');
      }
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `Login failed (${res.status})`);
      if (!body?.token) throw new Error('No token returned');
      setAdminToken(body.token);
      onSuccess();
    } catch (e2) {
      setErr(e2?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: AC.bg }}>
      <form onSubmit={submit} className="w-full max-w-[360px]" style={{
        background: AC.surface, border: `1px solid ${AC.border}`, borderRadius: AC.radius,
        boxShadow: AC.shadowLg, padding: 28,
      }}>
        <div className="flex items-center justify-center mb-4" style={{
          width: 40, height: 40, borderRadius: 10, background: AC.railBg,
          color: AC.accent, fontFamily: AC.brandFont, fontSize: 20, fontWeight: 600,
        }}>M</div>
        <h1 style={{ fontFamily: AC.brandFont, fontSize: 24, fontWeight: 500, color: AC.text, letterSpacing: '-.02em' }}>
          Go Mama · <span style={{ fontStyle: 'italic', color: AC.accent, fontWeight: 500 }}>Console</span>
        </h1>
        <p className="mt-1 mb-5" style={{ fontFamily: AC.font, fontSize: 13, color: AC.textSoft }}>
          Enter the admin password to continue.
        </p>
        <input
          type="password" value={password} autoFocus
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="w-full mb-3 outline-none"
          style={{
            background: AC.bg, border: `1px solid ${err ? AC.danger : AC.borderStrong}`,
            borderRadius: AC.radiusSm, padding: '11px 13px', color: AC.text, fontFamily: AC.font, fontSize: 14,
          }}
        />
        {err && <div className="mb-3" style={{ fontFamily: AC.font, fontSize: 12.5, color: AC.danger }}>{err}</div>}
        <button type="submit" disabled={submitting || !password}
          className="w-full flex items-center justify-center"
          style={{
            background: AC.accent, color: AC.accentText, borderRadius: AC.radiusSm, padding: '11px',
            fontFamily: AC.font, fontWeight: 600, fontSize: 14, opacity: (submitting || !password) ? 0.6 : 1,
          }}>
          {submitting ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
};
